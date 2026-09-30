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
    scroller.dispatchEvent(new Event('scroll'))
    expect(track.dataset.revealHost).toBe('off')
  })

  it('a scroll after input reveals, then lingers out', () => {
    vi.useFakeTimers()
    const { scroller, track } = mount(400, 2000)
    window.dispatchEvent(new KeyboardEvent('keydown'))
    scroller.dispatchEvent(new Event('scroll'))
    expect(track.dataset.revealHost).toBe('on')
    scroller.dispatchEvent(new Event('scrollend'))
    vi.advanceTimersByTime(SCROLLBAR_LINGER_MS - 1)
    expect(track.dataset.revealHost).toBe('on')
    vi.advanceTimersByTime(1)
    expect(track.dataset.revealHost).toBe('off')
  })
})
