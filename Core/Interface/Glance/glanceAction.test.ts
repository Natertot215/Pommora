// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GLANCE_BODY_ATTR,
  GLANCE_DWELL,
  armPreview,
  cancelGlance,
  closeGlance,
  glanceLink,
  glanceShown,
  hoverGlance,
  leaveGlance,
  setGlancePresenter,
  setGlanceShown,
  watchAnchor,
  type GlanceRequest,
} from './glanceAction'
import { useSession } from '../../Session/store'
import { makeTree } from '../../Testing/testTree'
import type { PreviewPersistence } from '../../Settings/personalization'

const page = { kind: 'page', id: 'p1', path: 'Notes/A.md' } as const
const site = { kind: 'site', url: 'https://example.com' } as const

const setPersistence = (v: PreviewPersistence | undefined): void =>
  useSession.setState({ tree: makeTree({ personalization: { previewPersistence: v } }) })

const pressShift = (repeat = false): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', repeat }))
}

let present: ReturnType<typeof vi.fn<(next: GlanceRequest | null) => void>>
let el: HTMLElement

beforeEach(() => {
  vi.useFakeTimers()
  present = vi.fn()
  setGlancePresenter(present)
  el = document.createElement('span')
  document.body.appendChild(el)
})

afterEach(() => {
  leaveGlance()
  setPersistence(undefined)
  setGlancePresenter(null)
  setGlanceShown(false)
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('the shown flag', () => {
  it('starts false and reflects setGlanceShown', () => {
    expect(glanceShown()).toBe(false)
    setGlanceShown(true)
    expect(glanceShown()).toBe(true)
    setGlanceShown(false)
    expect(glanceShown()).toBe(false)
  })
})

describe('the dwell', () => {
  it('fires once after the named dwell', () => {
    armPreview(page, el, 'link')
    vi.advanceTimersByTime(GLANCE_DWELL.link - 1)
    expect(present).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith({ target: page, el })
  })

  it('a re-arm replaces the pending one and fires with the latest target', () => {
    armPreview(page, el, 'link')
    vi.advanceTimersByTime(GLANCE_DWELL.link / 2)
    armPreview(site, el, 'link')
    vi.advanceTimersByTime(GLANCE_DWELL.link)
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith({ target: site, el })
  })

  it('cancel prevents the fire', () => {
    armPreview(page, el, 'link')
    cancelGlance()
    vi.advanceTimersByTime(GLANCE_DWELL.link)
    expect(present).not.toHaveBeenCalled()
  })

  it('close clears a pending dwell and presents null', () => {
    armPreview(page, el, 'link')
    closeGlance()
    vi.advanceTimersByTime(GLANCE_DWELL.link)
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith(null)
  })

  it('an arm with no presenter is a no-op', () => {
    setGlancePresenter(null)
    armPreview(page, el, 'link')
    expect(() => vi.advanceTimersByTime(GLANCE_DWELL.link)).not.toThrow()
    expect(present).not.toHaveBeenCalled()
  })

  it("an anchor inside the pane's own body never arms", () => {
    const body = document.createElement('div')
    body.setAttribute(GLANCE_BODY_ATTR, '')
    body.appendChild(el)
    document.body.appendChild(body)
    armPreview(page, el, 'link')
    vi.advanceTimersByTime(GLANCE_DWELL.link)
    expect(present).not.toHaveBeenCalled()
  })
})

describe('the anchor watch', () => {
  const frames = new Map<number, FrameRequestCallback>()
  let lastFrame = 0
  beforeEach(() => {
    frames.clear()
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      frames.set(++lastFrame, fn)
      return lastFrame
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  })
  afterEach(() => vi.unstubAllGlobals())
  const runFrame = (): void => {
    const [id, fn] = frames.entries().next().value ?? []
    if (id === undefined || !fn) return
    frames.delete(id)
    fn(0)
  }
  const flushFrames = (): void => {
    while (frames.size > 0) runFrame()
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

  it('a watch stopped between its two frames never reports the anchor gone', () => {
    const watch = { onGone: vi.fn(), onEscape: vi.fn(), onMoved: vi.fn() }
    const stop = watchAnchor(el, watch)
    window.dispatchEvent(new Event('scroll'))
    runFrame()
    el.remove()
    stop()
    flushFrames()
    expect(watch.onGone).not.toHaveBeenCalled()
  })

  it('Shift closes the pane, the summon key doubling as the dismiss, and ignores auto-repeat', () => {
    const watch = { onGone: vi.fn(), onEscape: vi.fn(), onMoved: vi.fn() }
    const stop = watchAnchor(el, watch)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
    expect(watch.onEscape).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', repeat: true }))
    expect(watch.onEscape).toHaveBeenCalledTimes(1)
    stop()
  })

  it('dismisses on an outside press only when dismissOnPress is set, and never on a press inside the body', () => {
    const body = document.createElement('div')
    const outside = document.createElement('div')
    document.body.append(body, outside)
    const press = (t: Element): void => {
      t.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }))
    }

    const ignored = { onGone: vi.fn(), onEscape: vi.fn(), onMoved: vi.fn() }
    const stopIgnored = watchAnchor(el, ignored)
    press(outside)
    expect(ignored.onEscape).not.toHaveBeenCalled()
    stopIgnored()

    const armed = {
      onGone: vi.fn(),
      onEscape: vi.fn(),
      onMoved: vi.fn(),
      body: () => body,
      dismissOnPress: true,
    }
    const stopArmed = watchAnchor(el, armed)
    press(body)
    expect(armed.onEscape).not.toHaveBeenCalled()
    press(outside)
    expect(armed.onEscape).toHaveBeenCalledTimes(1)
    stopArmed()
  })

  it('Escape closes and is consumed; any other key re-checks the anchor', () => {
    const watch = { onGone: vi.fn(), onEscape: vi.fn(), onMoved: vi.fn() }
    const stop = watchAnchor(el, watch)
    const esc = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    document.dispatchEvent(esc)
    expect(watch.onEscape).toHaveBeenCalledTimes(1)
    expect(esc.defaultPrevented).toBe(true)
    el.remove()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    flushFrames()
    expect(watch.onGone).toHaveBeenCalledTimes(1)
    stop()
  })
})

describe('the Off gate', () => {
  it("'off' arms nothing", () => {
    setPersistence('off')
    armPreview(page, el, 'link')
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })

  it('a set rung arms a preview', () => {
    setPersistence('1s')
    armPreview(page, el, 'link')
    vi.runAllTimers()
    expect(present).toHaveBeenCalledWith({ target: page, el })
  })

  it('an absent setting arms — the default is on', () => {
    setPersistence(undefined)
    armPreview(page, el, 'link')
    vi.runAllTimers()
    expect(present).toHaveBeenCalledTimes(1)
  })

  it('glanceLink routes the editor slot through the same gate', () => {
    setPersistence('off')
    glanceLink(page, el)
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })
})

describe('the hovered-Shift arm', () => {
  it('arms the hovered surface when Shift is pressed at rest, no re-enter needed', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', false)
    expect(present).not.toHaveBeenCalled()
    pressShift()
    vi.runAllTimers()
    expect(present).toHaveBeenCalledWith({ target: page, el })
  })

  it('ignores an auto-repeat keydown so the dwell is never reset out from under itself', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', false)
    pressShift(true)
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })

  it('armNow raises the preview immediately, without a keypress', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', true)
    vi.runAllTimers()
    expect(present).toHaveBeenCalledWith({ target: page, el })
  })

  it('leaveGlance clears the hovered surface, so a later Shift arms nothing', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', false)
    leaveGlance()
    pressShift()
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })

  it('honors the Off gate on the Shift arm', () => {
    setPersistence('off')
    hoverGlance(page, el, 'location', false)
    pressShift()
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })

  it('a right-click cancels the pending dwell and clears the hovered surface', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', true)
    window.dispatchEvent(new Event('contextmenu'))
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
    pressShift()
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })
})
