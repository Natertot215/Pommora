// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GLANCE_BODY_ATTR,
  GLANCE_DWELL,
  armGlance,
  cancelGlance,
  closeGlance,
  setGlancePresenter,
  watchAnchor,
} from './glance-action'

const page = { kind: 'page', id: 'p1', path: 'Notes/A.md' } as const
const site = { kind: 'site', url: 'https://example.com' } as const

let present: ReturnType<typeof vi.fn>
let el: HTMLElement

beforeEach(() => {
  vi.useFakeTimers()
  present = vi.fn()
  setGlancePresenter(present)
  el = document.createElement('span')
  document.body.appendChild(el)
})

afterEach(() => {
  cancelGlance()
  setGlancePresenter(null)
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('the dwell', () => {
  it('fires once after the named dwell', () => {
    armGlance(page, el, 'connection')
    vi.advanceTimersByTime(GLANCE_DWELL.connection - 1)
    expect(present).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith({ target: page, el })
  })

  it('a re-arm replaces the pending one and fires with the latest target', () => {
    armGlance(page, el, 'connection')
    vi.advanceTimersByTime(GLANCE_DWELL.connection / 2)
    armGlance(site, el, 'connection')
    vi.advanceTimersByTime(GLANCE_DWELL.connection)
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith({ target: site, el })
  })

  it('cancel prevents the fire', () => {
    armGlance(page, el, 'connection')
    cancelGlance()
    vi.advanceTimersByTime(GLANCE_DWELL.connection)
    expect(present).not.toHaveBeenCalled()
  })

  it('close clears a pending dwell and presents null', () => {
    armGlance(page, el, 'connection')
    closeGlance()
    vi.advanceTimersByTime(GLANCE_DWELL.connection)
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith(null)
  })

  it('an arm with no presenter is a no-op', () => {
    setGlancePresenter(null)
    armGlance(page, el, 'connection')
    expect(() => vi.advanceTimersByTime(GLANCE_DWELL.connection)).not.toThrow()
    expect(present).not.toHaveBeenCalled()
  })

  it("an anchor inside the pane's own body never arms", () => {
    const body = document.createElement('div')
    body.setAttribute(GLANCE_BODY_ATTR, '')
    body.appendChild(el)
    document.body.appendChild(body)
    armGlance(page, el, 'connection')
    vi.advanceTimersByTime(GLANCE_DWELL.connection)
    expect(present).not.toHaveBeenCalled()
  })
})

describe('the anchor watch', () => {
  const frames: FrameRequestCallback[] = []
  beforeEach(() => {
    frames.length = 0
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      frames.push(fn)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })
  afterEach(() => vi.unstubAllGlobals())
  const flushFrames = (): void => {
    while (frames.length > 0) frames.shift()?.(0)
  }

  it('reports the anchor gone two frames after a scroll removed it, and not while it stays', () => {
    const watch = { onGone: vi.fn(), onEscape: vi.fn(), onMoved: vi.fn() }
    const stop = watchAnchor(el, watch)
    window.dispatchEvent(new Event('scroll'))
    flushFrames()
    expect(watch.onMoved).toHaveBeenCalledTimes(1)
    expect(watch.onGone).not.toHaveBeenCalled()
    el.remove()
    window.dispatchEvent(new Event('scroll'))
    expect(watch.onGone).not.toHaveBeenCalled()
    flushFrames()
    expect(watch.onGone).toHaveBeenCalledTimes(1)
    stop()
    window.dispatchEvent(new Event('scroll'))
    flushFrames()
    expect(watch.onMoved).toHaveBeenCalledTimes(2)
  })

  it('Escape closes and is consumed; any other key re-checks the anchor', () => {
    const watch = { onGone: vi.fn(), onEscape: vi.fn(), onMoved: vi.fn() }
    const stop = watchAnchor(el, watch)
    const esc = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    window.dispatchEvent(esc)
    expect(watch.onEscape).toHaveBeenCalledTimes(1)
    expect(esc.defaultPrevented).toBe(true)
    el.remove()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    flushFrames()
    expect(watch.onGone).toHaveBeenCalledTimes(1)
    stop()
  })
})
