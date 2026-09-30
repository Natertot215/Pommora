// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SCROLLBAR_LINGER_MS, Scrollbar } from './Scrollbar'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const observers = new Set<() => void>()
class ResizeObserverStub {
  constructor(private readonly callback: () => void) {
    observers.add(callback)
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {
    observers.delete(this.callback)
  }
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

let onScreen: (visible: boolean) => void = () => {}
class IntersectionObserverStub {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(): void {
    onScreen = (visible) =>
      this.callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as never)
    onScreen(true)
  }
  disconnect(): void {}
}
;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = IntersectionObserverStub

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

const mount = (client: number, scroll: number) => {
  act(() =>
    root.render(
      <div>
        <div data-testid="scroller" />
        <Scrollbar />
      </div>,
    ),
  )
  const scroller = host.querySelector<HTMLElement>('[data-testid="scroller"]')!
  Object.defineProperties(scroller, {
    clientHeight: { value: client },
    scrollHeight: { value: scroll },
  })
  for (const measure of observers) measure()
  return { scroller, track: scroller.nextElementSibling as HTMLElement }
}

describe('Scrollbar', () => {
  it('stays hidden below the overflow ratio', () => {
    expect(mount(400, 480).track.hasAttribute('data-overflow')).toBe(false)
  })

  it('shows past the ratio and publishes the visible share', () => {
    const { track } = mount(400, 2000)
    expect(track.hasAttribute('data-overflow')).toBe(true)
    expect(track.style.getPropertyValue('--scrollbar-visible')).toBe('0.2')
  })

  it('a scroll before any input never reveals', () => {
    const { scroller, track } = mount(400, 2000)
    scroller.scrollTop = 300
    scroller.dispatchEvent(new Event('scroll'))
    expect(track.dataset.revealHost).toBe('off')
  })

  it('a scroll landing where the bar last saw it never reveals', () => {
    vi.useFakeTimers()
    const { scroller, track } = mount(400, 2000)
    window.dispatchEvent(new KeyboardEvent('keydown'))
    scroller.scrollTop = 300
    scroller.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(SCROLLBAR_LINGER_MS)
    scroller.scrollTop = 0
    scroller.scrollTop = 300
    scroller.dispatchEvent(new Event('scroll'))
    expect(track.dataset.revealHost).toBe('off')
  })

  it('resting near the edge lingers out as a scroll does', () => {
    vi.useFakeTimers()
    const { track } = mount(400, 2000)
    track.parentElement!.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 0 }))
    expect(track.dataset.revealHost).toBe('on')
    vi.advanceTimersByTime(SCROLLBAR_LINGER_MS)
    expect(track.dataset.revealHost).toBe('off')
  })

  it('input while off screen never arms, and a return disarms', () => {
    const { scroller, track } = mount(400, 2000)
    window.dispatchEvent(new KeyboardEvent('keydown'))
    onScreen(false)
    window.dispatchEvent(new KeyboardEvent('keydown'))
    onScreen(true)
    scroller.scrollTop = 300
    scroller.dispatchEvent(new Event('scroll'))
    expect(track.dataset.revealHost).toBe('off')
  })

  it('a scroll after input reveals, then lingers out from its last event', () => {
    vi.useFakeTimers()
    const { scroller, track } = mount(400, 2000)
    window.dispatchEvent(new KeyboardEvent('keydown'))
    scroller.scrollTop = 300
    scroller.dispatchEvent(new Event('scroll'))
    expect(track.dataset.revealHost).toBe('on')
    vi.advanceTimersByTime(SCROLLBAR_LINGER_MS - 1)
    expect(track.dataset.revealHost).toBe('on')
    vi.advanceTimersByTime(1)
    expect(track.dataset.revealHost).toBe('off')
  })
})
