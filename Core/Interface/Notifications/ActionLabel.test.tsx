// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ActionLabel } from './ActionLabel'
import {
  type ActionBar,
  clearNotification,
  notify,
  notifyDeleted,
  useDeclareActions,
} from './notifications'
import { duration, ms } from '@pommora/uix/Animations/motion'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  act(() => root.render(<ActionLabel />))
})

afterEach(() => {
  act(() => {
    clearNotification()
    root.unmount()
  })
  host.remove()
  vi.useRealTimers()
})

const label = (): Element | null => host.querySelector('[role=status]')
const face = (): Element | null | undefined => label()?.querySelector('[data-face="shown"]')
const inert = (): boolean => label()?.hasAttribute('inert') ?? false

const fakeTimers = (): void => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  })
}
const move = (x: number, buttons = 0): void =>
  act(() => {
    document.body.dispatchEvent(
      new PointerEvent('pointermove', { clientX: x, clientY: 20, buttons, bubbles: true }),
    )
  })
const run = (ms: number): void =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })
const stubBox = (el: HTMLElement): void => {
  el.getBoundingClientRect = () => ({ left: 100, top: 0, right: 300, bottom: 40 }) as DOMRect
}

describe('ActionLabel', () => {
  it('draws the segment after the message behind one hidden divider', () => {
    act(() => notify('Deleted “Ideas”', vi.fn(), { segment: '2 Internal Links' }))
    const dividers = face()?.querySelectorAll('[aria-hidden="true"]') ?? []
    expect(dividers).toHaveLength(1)
    expect([
      dividers[0].previousSibling?.textContent,
      dividers[0].nextSibling?.textContent,
    ]).toEqual(['Deleted “Ideas”', '2 Internal Links'])
  })

  it('draws a notice without a segment as its message alone', () => {
    act(() => notifyDeleted('Ideas', vi.fn()))
    expect(face()?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
    expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
  })
})

describe('the drain near the pointer', () => {
  beforeEach(() => {
    fakeTimers()
    act(() => notifyDeleted('Ideas', vi.fn()))
    stubBox(label() as HTMLElement)
  })

  it('a notice posted under the pointer drains while the pointer stays in its band', () => {
    move(400)
    move(390)
    run(10_000)
    expect(inert()).toBe(true)
  })

  it('stalls within its band once the pointer has been outside it, and drains once it leaves again', () => {
    move(401)
    move(400)
    run(10_000)
    expect(inert()).toBe(false)
    move(401)
    run(10_000)
    expect(inert()).toBe(true)
  })

  it('holds where it stands through a press, once the pointer has been outside its band', () => {
    move(401)
    move(400)
    move(1000, 1)
    run(10_000)
    expect(inert()).toBe(false)
  })
})

describe('the bar a shown view declares', () => {
  function Declarer({ bar, shown }: { bar: ActionBar; shown: boolean }): null {
    useDeclareActions(bar, shown)
    return null
  }
  const barOf = (count: string): ActionBar => ({ count, restore: vi.fn(), remove: vi.fn() })
  const mount = (bars: ActionBar[], shown = true): void =>
    act(() =>
      root.render(
        <>
          {bars.map((bar, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a declarer is its place in the stack
            <Declarer key={i} bar={bar} shown={shown} />
          ))}
          <ActionLabel />
        </>,
      ),
    )
  const declare = (restore: () => void = vi.fn()): ActionBar => {
    const bar = { ...barOf('2 Pages'), restore }
    mount([bar])
    return bar
  }
  const press = (button: Element | null | undefined): void =>
    act(() => (button as HTMLElement).click())
  const restoreButton = (): Element | undefined =>
    [...(face()?.querySelectorAll('button') ?? [])].find((b) => b.textContent === 'Restore')

  it('draws a declared bar as Restore, its count, and a Delete button while nothing is posted', () => {
    const bar = declare()
    expect(inert()).toBe(false)
    expect(face()?.textContent).toBe('Restore2 Pages')
    press(restoreButton())
    press(face()?.querySelector('button[title="Delete"]'))
    expect(bar.restore).toHaveBeenCalledOnce()
    expect(bar.remove).toHaveBeenCalledOnce()
  })

  it('yields the bar to a posted notice and takes it back once its three seconds drain', () => {
    fakeTimers()
    declare()
    act(() => notifyDeleted('Ideas', vi.fn()))
    expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
    expect(inert()).toBe(false)
    run(2_900)
    expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
    run(200 + ms(duration.base))
    expect(face()?.textContent).toBe('Restore2 Pages')
    expect(inert()).toBe(false)
  })

  it('withdraws the bar once its view hides, and once it unmounts', () => {
    const bar = declare()
    mount([bar], false)
    expect(inert()).toBe(true)
    mount([bar])
    expect(inert()).toBe(false)
    mount([])
    expect(inert()).toBe(true)
  })

  it('a bar declared over another shows, and withdrawing it reveals the one beneath', () => {
    const under = barOf('1 Page')
    mount([under])
    mount([under, barOf('2 Pages')])
    expect(face()?.textContent).toBe('Restore2 Pages')
    mount([under])
    expect(inert()).toBe(false)
    expect(face()?.textContent).toBe('Restore1 Page')
  })

  it('a covered bar that re-declares stays beneath the bar over it', () => {
    const over = barOf('2 Pages')
    mount([barOf('1 Page'), over])
    mount([barOf('3 Pages'), over])
    expect(face()?.textContent).toBe('Restore2 Pages')
  })

  it('keeps the hidden face out of reach: inert and aria-hidden, its buttons unfocusable', () => {
    declare()
    act(() => notifyDeleted('Ideas', vi.fn()))
    const hidden = label()?.querySelector('[data-face="hidden"]')
    expect(hidden?.querySelector('button[title="Delete"]')).not.toBeNull()
    expect(hidden?.hasAttribute('inert')).toBe(true)
    expect(hidden?.getAttribute('aria-hidden')).toBe('true')
  })

  it('holds phrasing content alone in both faces', () => {
    declare()
    act(() => notifyDeleted('Ideas', vi.fn()))
    expect(label()?.querySelectorAll('[data-face]')).toHaveLength(2)
    expect(label()?.querySelectorAll('[data-face] div')).toHaveLength(0)
  })

  it("a notice its own bar's press posts arms at once, so the drain stalls under the pointer", () => {
    fakeTimers()
    declare(() => notifyDeleted('Ideas', vi.fn()))
    const el = label() as HTMLElement
    stubBox(el)
    vi.spyOn(el, 'matches').mockImplementation((selector) => selector === ':hover')
    press(restoreButton())
    move(400)
    move(390)
    run(10_000)
    expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
  })
})
