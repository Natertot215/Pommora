// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { pushDismissal } from './dismissalStack'
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
  vi.restoreAllMocks()
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

  it('keeps a lane scrolled while the pointer moves onto caps inside it, and slides back each one it leaves', () => {
    vi.useFakeTimers()
    document.body.innerHTML = `<div class="scroll-fade-x over-scroll-cap"><b>·</b><span class="over-scroll-cap">one</span><span class="over-scroll-cap">two</span></div><p>elsewhere</p>`
    const [lane, one, two] = document.querySelectorAll<HTMLElement>('.over-scroll-cap')
    hover(document.querySelector('b') as HTMLElement)
    lane.scrollLeft = 120
    hover(one)
    one.scrollLeft = 50
    hover(two)
    vi.advanceTimersByTime(500)
    expect(lane.scrollLeft).toBe(120)
    expect(one.scrollLeft).toBe(0)
    two.scrollLeft = 50
    hover(document.querySelector('p') as HTMLElement)
    vi.advanceTimersByTime(500)
    expect(two.scrollLeft).toBe(0)
    expect(lane.scrollLeft).toBe(0)
  })

  const scrolledLane = (inside: string): HTMLElement => {
    vi.useFakeTimers()
    document.body.innerHTML = `<div class="scroll-fade-x over-scroll-cap"><b>·</b>${inside}</div><p>elsewhere</p>`
    const lane = document.querySelector<HTMLElement>('.over-scroll-cap') as HTMLElement
    hover(document.querySelector('b') as HTMLElement)
    lane.scrollLeft = 120
    return lane
  }
  const leave = (): void => {
    hover(document.querySelector('p') as HTMLElement)
    vi.advanceTimersByTime(500)
  }

  it('keeps a lane scrolled while it holds an open layer’s trigger, through its closing, and slides it back once that layer is gone with the pointer elsewhere', () => {
    const lane = scrolledLane('')
    const open = pushDismissal({ layer: () => null, trigger: () => document.querySelector('b') })
    leave()
    expect(lane.scrollLeft).toBe(120)
    open.setClosing(true)
    vi.advanceTimersByTime(500)
    expect(lane.scrollLeft).toBe(120)
    open.release()
    vi.advanceTimersByTime(500)
    expect(lane.scrollLeft).toBe(0)
  })

  it('keeps a lane scrolled when its layer goes with the pointer on it, and slides it back on the later leave', () => {
    const lane = scrolledLane('')
    const open = pushDismissal({ layer: () => null, trigger: () => document.querySelector('b') })
    leave()
    hover(lane)
    open.release()
    vi.advanceTimersByTime(500)
    expect(lane.scrollLeft).toBe(120)
    leave()
    expect(lane.scrollLeft).toBe(0)
  })

  it('keeps a lane scrolled while it holds the focused field, and slides it back once focus leaves with the pointer elsewhere, a field closing on its own blur included', () => {
    const lane = scrolledLane('<input>')
    const field = document.querySelector('input') as HTMLInputElement
    field.addEventListener('blur', () => field.remove())
    field.focus()
    leave()
    expect(lane.scrollLeft).toBe(120)
    field.blur()
    vi.advanceTimersByTime(500)
    expect(lane.scrollLeft).toBe(0)
  })

  it('listens for a kept lane’s release only while a lane is kept', () => {
    const added = vi.spyOn(document, 'addEventListener')
    const removed = vi.spyOn(document, 'removeEventListener')
    const lane = scrolledLane('<input>')
    const field = document.querySelector('input') as HTMLInputElement
    field.focus()
    leave()
    field.blur()
    vi.advanceTimersByTime(500)
    const blurs = (spy: typeof added): number =>
      spy.mock.calls.filter(([type]) => type === 'blur').length
    expect(blurs(added)).toBe(1)
    expect(blurs(removed)).toBe(1)
    lane.scrollLeft = 120
    pushDismissal({ layer: () => null, trigger: () => null }).release()
    vi.advanceTimersByTime(500)
    expect(lane.scrollLeft).toBe(120)
  })
})
