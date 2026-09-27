// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import './OverScroll'

beforeAll(() => {
  const proto = HTMLElement.prototype
  Object.defineProperty(proto, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('over-scroll-cap') ? 300 : 0
    },
  })
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get: () => 100 })
})

afterEach(() => {
  document.dispatchEvent(new Event('pointerleave'))
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const label = (): HTMLElement => {
  document.body.innerHTML = `<div class="over-scroll-host"><i>·</i><span class="scroll-fade-x over-scroll-cap">a long label</span></div>`
  return document.querySelector<HTMLElement>('.over-scroll-cap') as HTMLElement
}

const wheel = (target: Element, deltaX: number): WheelEvent => {
  const e = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX })
  target.dispatchEvent(e)
  return e
}

const hover = (target: Element): void => {
  target.dispatchEvent(new Event('pointerover', { bubbles: true }))
}

describe('OverScroll', () => {
  it('scrolls a hovered label under the wheel, through its host', () => {
    const cap = label()
    const icon = document.querySelector('i') as HTMLElement
    hover(icon)
    const e = wheel(icon, 40)
    expect(cap.scrollLeft).toBe(40)
    expect(e.defaultPrevented).toBe(true)
  })

  it('leaves the wheel alone once no label is hovered', () => {
    label()
    document.body.insertAdjacentHTML('beforeend', '<p>elsewhere</p>')
    const p = document.querySelector('p') as HTMLElement
    hover(p)
    expect(wheel(p, 40).defaultPrevented).toBe(false)
  })

  it('reaches a label that remounted under a still pointer', () => {
    const cap = label()
    hover(cap)
    const fresh = cap.cloneNode(true) as HTMLElement
    cap.replaceWith(fresh)
    wheel(fresh, 40)
    expect(fresh.scrollLeft).toBe(40)
  })

  it('slides back on leave, and a wheel mid-slide stops the slide', () => {
    vi.useFakeTimers()
    const cap = label()
    hover(cap)
    wheel(cap, 200)
    document.body.insertAdjacentHTML('beforeend', '<p>elsewhere</p>')
    hover(document.querySelector('p') as HTMLElement)
    vi.advanceTimersByTime(50)
    expect(cap.scrollLeft).toBeLessThan(200)
    expect(cap.scrollLeft).toBeGreaterThan(0)
    hover(cap)
    wheel(cap, 30)
    const settled = cap.scrollLeft
    vi.advanceTimersByTime(500)
    expect(cap.scrollLeft).toBe(settled)
  })
})
