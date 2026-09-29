// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addSpring, beginDragDisclose, endDragDisclose } from './dragDisclose'

let under: Element | null = null
document.elementFromPoint = () => under

let surface: HTMLDivElement
let source: HTMLDivElement
let springs: Array<() => void> = []
// The hover throttle's last-check time outlives each test, so every test starts well past it.
let clock = 0

const el = (parent: Element, tag = 'div'): HTMLElement =>
  parent.appendChild(document.createElement(tag))
const spring = (target: Element, expand: () => void): void => {
  springs.push(addSpring(target, expand))
}

beforeEach(() => {
  vi.useFakeTimers()
  clock += 10_000
  vi.advanceTimersByTime(clock)
  surface = el(document.body) as HTMLDivElement
  source = el(surface) as HTMLDivElement
  beginDragDisclose(() => {}, surface, source)
})
afterEach(() => {
  endDragDisclose()
  for (const off of springs) off()
  springs = []
  surface.remove()
  under = null
  vi.useRealTimers()
})

const moveOver = (target: Element | null): void => {
  under = target
  window.dispatchEvent(new PointerEvent('pointermove'))
}
// The hover check is throttled, so each move lands past the last one's window.
const hoverOver = (target: Element | null): void => {
  vi.advanceTimersByTime(200)
  moveOver(target)
}
const dwell = (): void => void vi.advanceTimersByTime(600)

describe('addSpring', () => {
  it('springs a row open from a pointer resting on its content, calling the latest expand', () => {
    const first = vi.fn()
    const latest = vi.fn()
    let expand = first
    const row = el(surface)
    const child = el(row, 'span')
    spring(row, () => expand())
    hoverOver(child)
    expand = latest
    dwell()
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledOnce()
  })

  it('opens the innermost of two nested rows', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    const outerRow = el(surface)
    const innerRow = el(outerRow)
    const child = el(innerRow, 'span')
    spring(outerRow, outer)
    spring(innerRow, inner)
    hoverOver(child)
    dwell()
    expect(outer).not.toHaveBeenCalled()
    expect(inner).toHaveBeenCalledOnce()
  })

  it('drops a pending dwell when its row unregisters', () => {
    const expand = vi.fn()
    const row = el(surface)
    const child = el(row, 'span')
    const off = addSpring(row, expand)
    hoverOver(child)
    off()
    dwell()
    expect(expand).not.toHaveBeenCalled()
  })

  it('springs a target inside the surface after a still dwell, though its last move was throttled', () => {
    const expand = vi.fn()
    const row = el(surface)
    const child = el(row, 'span')
    spring(row, expand)
    hoverOver(null)
    vi.advanceTimersByTime(10)
    moveOver(child)
    vi.advanceTimersByTime(100)
    dwell()
    expect(expand).toHaveBeenCalledOnce()
  })

  it('never springs a target outside the surface, nor the source row', () => {
    const outside = vi.fn()
    const own = vi.fn()
    const elsewhere = el(document.body)
    const outsideChild = el(elsewhere, 'span')
    const sourceChild = el(source, 'span')
    spring(elsewhere, outside)
    spring(source, own)
    hoverOver(outsideChild)
    dwell()
    hoverOver(sourceChild)
    dwell()
    expect(outside).not.toHaveBeenCalled()
    expect(own).not.toHaveBeenCalled()
    elsewhere.remove()
  })

  it('confirms the target at fire: content that scrolled away does not open', () => {
    const expand = vi.fn()
    const row = el(surface)
    const child = el(row, 'span')
    spring(row, expand)
    hoverOver(child)
    under = null
    dwell()
    expect(expand).not.toHaveBeenCalled()
  })
})
