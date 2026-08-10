// @vitest-environment jsdom
// The skeleton's `live` lock is module state with no reset seam, so every test loads a fresh
// module — the throwing-teardown test would otherwise strand the lock for the rest of the file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { firePointer, stubPointerCapture } from '@renderer/testing/pointerHarness'
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

  it('a window blur cancels: a pending press detaches silently, an active drag aborts', () => {
    const onAbort = vi.fn()
    gesture.beginPointerGesture(spec({ onAbort }))
    window.dispatchEvent(new Event('blur'))
    expect(onAbort).not.toHaveBeenCalled()
    expect(gesture.beginPointerGesture(spec({ onAbort }))).not.toBeNull()
    move(20, 20)
    window.dispatchEvent(new Event('blur'))
    expect(onAbort).toHaveBeenCalledOnce()
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
