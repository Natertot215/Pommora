// @vitest-environment jsdom
// The skeleton's `live` lock is module state with no reset seam, so every test loads a fresh module — the throwing-teardown test would otherwise strand the lock for the rest of the file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { firePointer, stubPointerCapture } from '../Testing/pointerHarness'
import { pushDismissal } from './dismissalStack'
import type { PointerGestureSpec } from './gesture'

stubPointerCapture()

type GestureModule = typeof import('./gesture')

let gesture: GestureModule
let el: HTMLElement
let errSpy: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  vi.resetModules()
  gesture = await import('./gesture')
  el = document.createElement('div')
  document.body.appendChild(el)
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  // A gesture a test leaves live would claim the next test's Escape from its stale module.
  window.dispatchEvent(new Event('blur'))
  el.remove()
  errSpy.mockRestore()
})

const press = (pointerId = 1): PointerGestureSpec['event'] =>
  ({
    button: 0,
    isPrimary: true,
    clientX: 0,
    clientY: 0,
    pointerId,
  }) as unknown as PointerGestureSpec['event']

const spec = (overrides: Partial<PointerGestureSpec>): PointerGestureSpec => ({
  el,
  event: press(),
  onActivate: () => true,
  onDragMove: () => {},
  onDrop: () => {},
  ...overrides,
})

const move = (x: number, y: number, opts: { pointerId?: number; buttons?: number } = {}): void =>
  firePointer(window, 'pointermove', { x, y, ...opts })

describe('gesture skeleton hardening', () => {
  it('a throwing onActivate aborts cleanly: onAbort fires, no drop commits, the next begin succeeds', () => {
    const onAbort = vi.fn()
    const onDrop = vi.fn()
    gesture.beginPointerGesture(
      spec({
        onActivate: () => {
          throw new Error('boom')
        },
        onAbort,
        onDrop,
      }),
    )
    move(20, 20)
    expect(onAbort).toHaveBeenCalledOnce()
    firePointer(window, 'pointerup')
    expect(onDrop).not.toHaveBeenCalled()
    expect(gesture.beginPointerGesture(spec({}))).not.toBeNull()
  })

  it('a throwing onDragMove aborts the gesture and frees the lock', () => {
    const onAbort = vi.fn()
    gesture.beginPointerGesture(
      spec({
        onDragMove: () => {
          throw new Error('boom')
        },
        onAbort,
      }),
    )
    move(20, 20)
    expect(onAbort).toHaveBeenCalledOnce()
    expect(gesture.beginPointerGesture(spec({}))).not.toBeNull()
  })

  it('a throwing teardown still clears the lock', () => {
    gesture.beginPointerGesture(
      spec({
        teardown: () => {
          throw new Error('boom')
        },
      }),
    )
    move(20, 20)
    firePointer(window, 'pointerup')
    expect(gesture.beginPointerGesture(spec({}))).not.toBeNull()
  })

  it('a foreign pointer cannot steer or end the gesture', () => {
    const onDrop = vi.fn()
    const onDragMove = vi.fn()
    gesture.beginPointerGesture(spec({ onDragMove, onDrop }))
    move(20, 20)
    const moved = onDragMove.mock.calls.length
    move(60, 60, { pointerId: 2 })
    expect(onDragMove.mock.calls.length).toBe(moved)
    firePointer(window, 'pointerup', { pointerId: 2 })
    expect(onDrop).not.toHaveBeenCalled()
    firePointer(window, 'pointerup')
    expect(onDrop).toHaveBeenCalledOnce()
  })

  it('a window blur cancels: a pending press and an active drag both abort, and the next begin succeeds', () => {
    const onAbort = vi.fn()
    gesture.beginPointerGesture(spec({ onAbort }))
    window.dispatchEvent(new Event('blur'))
    expect(onAbort).toHaveBeenCalledOnce()
    expect(gesture.beginPointerGesture(spec({ onAbort }))).not.toBeNull()
    move(20, 20)
    window.dispatchEvent(new Event('blur'))
    expect(onAbort).toHaveBeenCalledTimes(2)
  })

  it('a move with no buttons held aborts — the release was missed', () => {
    const onAbort = vi.fn()
    const onDrop = vi.fn()
    gesture.beginPointerGesture(spec({ onAbort, onDrop }))
    move(20, 20)
    move(30, 30, { buttons: 0 })
    expect(onAbort).toHaveBeenCalledOnce()
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('onWindowScroll fires only while active and never after teardown', () => {
    const onWindowScroll = vi.fn()
    gesture.beginPointerGesture(spec({ onWindowScroll }))
    window.dispatchEvent(new Event('scroll'))
    expect(onWindowScroll).not.toHaveBeenCalled()
    move(20, 20)
    window.dispatchEvent(new Event('scroll'))
    expect(onWindowScroll).toHaveBeenCalledOnce()
    firePointer(window, 'pointerup')
    window.dispatchEvent(new Event('scroll'))
    expect(onWindowScroll).toHaveBeenCalledOnce()
  })

  it('scrollTarget gates the hook: an unrelated scroller never reaches it', () => {
    const onWindowScroll = vi.fn()
    const target = document.createElement('div')
    const unrelated = document.createElement('div')
    document.body.append(target, unrelated)
    gesture.beginPointerGesture(spec({ onWindowScroll, scrollTarget: () => target }))
    move(20, 20)
    unrelated.dispatchEvent(new Event('scroll'))
    expect(onWindowScroll).not.toHaveBeenCalled()
    document.body.dispatchEvent(new Event('scroll'))
    expect(onWindowScroll).toHaveBeenCalledOnce()
    target.remove()
    unrelated.remove()
  })

  it('Escape aborts an active drag and the next begin succeeds', () => {
    const onAbort = vi.fn()
    const onDrop = vi.fn()
    gesture.beginPointerGesture(spec({ onAbort, onDrop }))
    move(20, 20)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onAbort).toHaveBeenCalledOnce()
    firePointer(window, 'pointerup')
    expect(onDrop).not.toHaveBeenCalled()
    expect(gesture.beginPointerGesture(spec({}))).not.toBeNull()
  })

  it('Escape mid-drag cancels only the drag; below the threshold it reaches the dismissal stack', () => {
    const dismiss = vi.fn()
    const entry = pushDismissal({ layer: () => null, dismiss })
    const pressEscape = (): boolean =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    const onAbort = vi.fn()
    gesture.beginPointerGesture(spec({ onAbort }))
    move(20, 20)
    pressEscape()
    expect(onAbort).toHaveBeenCalledOnce()
    expect(dismiss).not.toHaveBeenCalled()
    gesture.beginPointerGesture(spec({}))
    pressEscape()
    expect(dismiss).toHaveBeenCalledOnce()
    entry.release()
  })

  it('pointercancel aborts an active drag', () => {
    const onAbort = vi.fn()
    const onDrop = vi.fn()
    gesture.beginPointerGesture(spec({ onAbort, onDrop }))
    move(20, 20)
    firePointer(window, 'pointercancel')
    expect(onAbort).toHaveBeenCalledOnce()
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('teardown runs before onAbort on every abort path — per-gesture state consumed by onAbort must not be cleared in teardown', () => {
    const calls: string[] = []
    gesture.beginPointerGesture(
      spec({
        teardown: () => calls.push('teardown'),
        onAbort: () => calls.push('abort'),
      }),
    )
    move(20, 20)
    firePointer(window, 'pointercancel')
    expect(calls).toEqual(['teardown', 'abort'])
  })
})

// A click-or-drag surface needs the release before activation to mean something. Only a release means it: every other way a gesture ends is a cancel, and a cancel must never fire the click.
describe('a release before activation is a tap, and only a release', () => {
  it('a sub-threshold release taps, without dropping or aborting', () => {
    const calls: string[] = []
    gesture.beginPointerGesture(
      spec({
        onTap: () => calls.push('tap'),
        onDrop: () => calls.push('drop'),
        onAbort: () => calls.push('abort'),
        teardown: () => calls.push('teardown'),
      }),
    )
    move(2, 2)
    firePointer(window, 'pointerup')
    expect(calls).toEqual(['teardown', 'tap'])
  })

  it('an activated release suppresses the click that follows it', () => {
    gesture.beginPointerGesture(spec({}))
    move(20, 20)
    firePointer(window, 'pointerup')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    el.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })

  it('the release after a cancelled drag is not a click either', () => {
    gesture.beginPointerGesture(spec({}))
    move(20, 20)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    firePointer(el, 'pointerup')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    el.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })

  it('an activated release drops rather than taps', () => {
    const calls: string[] = []
    gesture.beginPointerGesture(
      spec({ onTap: () => calls.push('tap'), onDrop: () => calls.push('drop') }),
    )
    move(20, 20)
    firePointer(window, 'pointerup')
    expect(calls).toEqual(['drop'])
  })

  it.each([
    ['pointercancel', () => firePointer(window, 'pointercancel')],
    ['Escape', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
    ['blur', () => window.dispatchEvent(new Event('blur'))],
    ['a lost release', () => move(2, 2, { buttons: 0 })],
  ])('%s ends a pending press without tapping', (_label, end) => {
    const onTap = vi.fn()
    gesture.beginPointerGesture(spec({ onTap }))
    end()
    firePointer(window, 'pointerup')
    expect(onTap).not.toHaveBeenCalled()
  })
})

describe('the item rule, the cursor, and autoscroll', () => {
  const pressOn = (target: Element): PointerGestureSpec['event'] =>
    ({
      button: 0,
      isPrimary: true,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      target,
      currentTarget: el,
    }) as unknown as PointerGestureSpec['event']

  it('the item rule: a field refuses, a control below the handle takes the slop', () => {
    const field = el.appendChild(document.createElement('input'))
    const control = el.appendChild(document.createElement('button'))
    const plain = el.appendChild(document.createElement('span'))
    expect(
      gesture.beginPointerGesture(spec({ activation: 'item', event: pressOn(field) })),
    ).toBeNull()

    const onActivate = vi.fn(() => true)
    gesture.beginPointerGesture(spec({ activation: 'item', event: pressOn(control), onActivate }))
    move(8, 0)
    expect(onActivate).not.toHaveBeenCalled()
    move(13, 0)
    expect(onActivate).toHaveBeenCalledOnce()
    firePointer(window, 'pointerup')

    const onPlain = vi.fn(() => true)
    gesture.beginPointerGesture(
      spec({ activation: 'item', event: pressOn(plain), onActivate: onPlain }),
    )
    move(6, 0)
    expect(onPlain).toHaveBeenCalledOnce()
  })

  it('a handle that is itself a button takes the slop, so a click-first item keeps its click', () => {
    const button = document.body.appendChild(document.createElement('button'))
    const onActivate = vi.fn(() => true)
    gesture.beginPointerGesture(
      spec({
        el: button,
        activation: 'item',
        event: { ...pressOn(button), currentTarget: button },
        onActivate,
      }),
    )
    move(8, 0)
    expect(onActivate).not.toHaveBeenCalled()
    move(13, 0)
    expect(onActivate).toHaveBeenCalledOnce()
    firePointer(window, 'pointerup')
    button.remove()
  })

  it('grabs on the captured element alone, and reports itself live only while active', () => {
    const live = spec({ cursor: 'grabbing' })
    const grabbing = (): boolean => live.el.hasAttribute('data-grabbing')
    expect(gesture.gestureLive()).toBe(false)
    gesture.beginPointerGesture(live)
    expect(gesture.gestureLive()).toBe(false)
    expect(grabbing()).toBe(false)
    move(20, 0)
    expect(gesture.gestureLive()).toBe(true)
    expect(grabbing()).toBe(true)
    expect(document.documentElement.className).toBe('')
    firePointer(window, 'pointerup')
    expect(gesture.gestureLive()).toBe(false)
    expect(grabbing()).toBe(false)
  })

  describe('autoscroll', () => {
    let rafMap: Map<number, (ts: number) => void>
    let rafId: number
    let clock: number
    let top: number
    let scroller: HTMLElement
    let scrollBy: ReturnType<typeof vi.fn>

    const flush = (times: number): void => {
      for (let i = 0; i < times; i++) {
        const pending = [...rafMap.values()]
        rafMap = new Map()
        clock += 16
        for (const cb of pending) cb(clock)
      }
    }

    beforeEach(() => {
      rafMap = new Map()
      rafId = 0
      clock = 0
      top = 400
      vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void) => {
        rafMap.set(++rafId, cb)
        return rafId
      })
      vi.stubGlobal('cancelAnimationFrame', (id: number) => void rafMap.delete(id))
      scrollBy = vi.fn((_x: number, y: number) => {
        top += y
      })
      scroller = document.createElement('div')
      scroller.style.overflowY = 'auto'
      Object.defineProperties(scroller, {
        scrollTop: { get: () => top, set: (v: number) => (top = v) },
        scrollLeft: { value: 0 },
        scrollHeight: { value: 1000 },
        clientHeight: { value: 300 },
        scrollWidth: { value: 300 },
        clientWidth: { value: 300 },
        scrollBy: { value: scrollBy },
        getBoundingClientRect: {
          value: () => ({ top: 0, bottom: 300, left: 0, right: 300, width: 300, height: 300 }),
        },
      })
      document.body.appendChild(scroller)
    })
    afterEach(() => {
      scroller.remove()
      vi.unstubAllGlobals()
    })

    const begin = (
      over: Partial<PointerGestureSpec> = {},
    ): ReturnType<GestureModule['beginPointerGesture']> => {
      const handle = gesture.beginPointerGesture(
        spec({ autoScroll: { from: scroller, axis: 'y' }, ...over }),
      )
      move(0, 150)
      return handle
    }

    it('arms autoscroll at activation and answers each step once, dropping its native echo', () => {
      const onWindowScroll = vi.fn()
      begin({ onWindowScroll })
      flush(3)
      expect(scrollBy).not.toHaveBeenCalled()
      move(0, 299)
      flush(30)
      expect(scrollBy.mock.calls.length).toBeGreaterThan(0)
      expect(onWindowScroll).toHaveBeenCalledTimes(scrollBy.mock.calls.length)
      expect(onWindowScroll).toHaveBeenLastCalledWith(scroller)
      const answered = onWindowScroll.mock.calls.length
      scroller.dispatchEvent(new Event('scroll'))
      expect(onWindowScroll).toHaveBeenCalledTimes(answered)
      top += 40
      scroller.dispatchEvent(new Event('scroll'))
      expect(onWindowScroll).toHaveBeenCalledTimes(answered + 1)
      top -= 40
      scroller.dispatchEvent(new Event('scroll'))
      expect(onWindowScroll).toHaveBeenCalledTimes(answered + 2)
    })

    it('does not arm before the press becomes a drag', () => {
      const handle = gesture.beginPointerGesture(
        spec({ autoScroll: { from: scroller, axis: 'y' } }),
      )
      handle?.autoScroll(true)
      move(0, 2)
      flush(3)
      expect(rafMap.size).toBe(0)
    })

    it('autoScroll(false) pauses the loop and autoScroll(true) resumes it', () => {
      const handle = begin()
      flush(3)
      move(0, 299)
      flush(20)
      const scrolled = top
      expect(scrolled).toBeGreaterThan(400)
      handle?.autoScroll(false)
      flush(20)
      expect(top).toBe(scrolled)
      handle?.autoScroll(true)
      move(0, 150)
      flush(3)
      move(0, 299)
      flush(20)
      expect(top).toBeGreaterThan(scrolled)
    })

    it.each([
      ['pointerup', () => firePointer(window, 'pointerup', { x: 0, y: 299 })],
      ['Escape', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
      ['blur', () => window.dispatchEvent(new Event('blur'))],
      ['abort', (handle: ReturnType<GestureModule['beginPointerGesture']>) => handle?.abort()],
    ])('%s stops the loop', (_name, exit) => {
      const handle = begin()
      flush(3)
      move(0, 299)
      flush(20)
      const scrolled = scrollBy.mock.calls.length
      expect(scrolled).toBeGreaterThan(0)
      exit(handle)
      flush(20)
      expect(rafMap.size).toBe(0)
      expect(scrollBy.mock.calls.length).toBe(scrolled)
    })
  })
})
