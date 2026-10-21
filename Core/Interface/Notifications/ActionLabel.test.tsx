// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ActionLabel } from './ActionLabel'
import {
  type ActionBar,
  clearNotification,
  notifyDeleted,
  useDeclareActions,
} from './notifications'
import { ContentHostContext } from '../contentHost'
import { duration, ms } from '@pommora/uix/Animations/motion'
import { DWELL_MS } from './action-label.css'
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
})

const label = (): Element | null => host.querySelector('[role=status]')
const face = (): Element | null | undefined => label()?.querySelector('[data-face="shown"]')

const FAKED = [
  'setTimeout',
  'clearTimeout',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'performance',
] as const
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
  it('draws the count after the title behind one hidden divider', () => {
    act(() => notifyDeleted('Ideas', vi.fn(), { pages: ['A.md', 'B.md'] }))
    const dividers = face()?.querySelectorAll('[aria-hidden="true"]') ?? []
    expect(dividers).toHaveLength(1)
    expect([
      dividers[0].previousSibling?.textContent,
      dividers[0].nextSibling?.textContent,
    ]).toEqual(['Deleted “Ideas”', '2 Internal Links'])
  })

  it('draws a notice without a count as its message alone', () => {
    act(() => notifyDeleted('Ideas', vi.fn()))
    expect(face()?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
    expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
  })
})

describe('the drain near the pointer', () => {
  const showing = (): boolean => !label()?.hasAttribute('inert')

  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...FAKED] })
    act(() => notifyDeleted('Ideas', vi.fn()))
    stubBox(label() as HTMLElement)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('a notice posted under the pointer drains while the pointer stays in its band', () => {
    move(400)
    move(390)
    run(10_000)
    expect(showing()).toBe(false)
  })

  it('stalls within its band once the pointer has been outside it, and drains once it leaves again', () => {
    move(401)
    move(400)
    run(10_000)
    expect(showing()).toBe(true)
    move(401)
    run(10_000)
    expect(showing()).toBe(false)
  })

  it('holds where it stands through a press, once the pointer has been outside its band', () => {
    move(401)
    move(400)
    move(1000, 1)
    run(10_000)
    expect(showing()).toBe(true)
  })
})

describe('the bar a shown view declares', () => {
  function Declarer({ bar }: { bar: ActionBar | null }): null {
    useDeclareActions(bar)
    return null
  }
  const mount = (bar: ActionBar | null, parked = false): void =>
    act(() =>
      root.render(
        <>
          <ContentHostContext.Provider value={{ tabId: 't1', key: 'collection:c1', parked }}>
            {bar && <Declarer bar={bar} />}
          </ContentHostContext.Provider>
          <ActionLabel />
        </>,
      ),
    )
  const declare = (restore: () => void = vi.fn()): ActionBar => {
    const bar = { count: '2 Pages', restore, remove: vi.fn() }
    mount(bar)
    return bar
  }
  const press = (selector: string): void =>
    act(() => (face()?.querySelector(selector) as HTMLElement).click())
  const restoreButton = (): Element | undefined =>
    [...(face()?.querySelectorAll('button') ?? [])].find((b) => b.textContent === 'Restore')
  const inert = (): boolean => label()?.hasAttribute('inert') ?? false

  it('draws a declared bar as Restore, its count, and a Delete button while nothing is posted', () => {
    const bar = declare()
    expect(inert()).toBe(false)
    expect(face()?.textContent).toBe('Restore2 Pages')
    act(() => (restoreButton() as HTMLElement).click())
    press('button[title="Delete"]')
    expect(bar.restore).toHaveBeenCalledOnce()
    expect(bar.remove).toHaveBeenCalledOnce()
  })

  it('yields the bar to a posted notice and takes it back once the notice drains', () => {
    vi.useFakeTimers({ toFake: [...FAKED] })
    try {
      declare()
      act(() => notifyDeleted('Ideas', vi.fn()))
      expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
      expect(inert()).toBe(false)
      run(DWELL_MS + ms(duration.base))
      expect(face()?.textContent).toBe('Restore2 Pages')
      expect(inert()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('withdraws the bar once its view parks, and once it unmounts', () => {
    const bar = declare()
    mount(bar, true)
    expect(inert()).toBe(true)
    mount(bar)
    expect(inert()).toBe(false)
    mount(null)
    expect(inert()).toBe(true)
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
    vi.useFakeTimers({ toFake: [...FAKED] })
    try {
      declare(() => notifyDeleted('Ideas', vi.fn()))
      const el = label() as HTMLElement
      stubBox(el)
      vi.spyOn(el, 'matches').mockImplementation((selector) => selector === ':hover')
      act(() => (restoreButton() as HTMLElement).click())
      move(400)
      move(390)
      run(10_000)
      expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
    } finally {
      vi.useRealTimers()
    }
  })
})
