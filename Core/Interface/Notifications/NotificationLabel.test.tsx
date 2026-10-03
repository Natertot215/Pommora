// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { NotificationLabel } from './NotificationLabel'
import { clearNotification, notifyDeleted } from './notifications'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  act(() => root.render(<NotificationLabel />))
})

afterEach(() => {
  act(() => {
    clearNotification()
    root.unmount()
  })
  host.remove()
})

const label = (): Element | null => host.querySelector('[role=status]')

describe('NotificationLabel', () => {
  it('draws the count after the title behind one hidden divider', () => {
    act(() => notifyDeleted('Ideas', vi.fn(), { pages: ['A.md', 'B.md'] }))
    const dividers = label()?.querySelectorAll('[aria-hidden="true"]') ?? []
    expect(dividers).toHaveLength(1)
    expect([
      dividers[0].previousSibling?.textContent,
      dividers[0].nextSibling?.textContent,
    ]).toEqual(['Deleted “Ideas”', '2 Internal Links'])
  })

  it('draws a notice without a count as its message alone', () => {
    act(() => notifyDeleted('Ideas', vi.fn()))
    expect(label()?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
    expect(label()?.textContent).toBe('Deleted “Ideas”Undo')
  })
})

describe('the drain near the pointer', () => {
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
  const showing = (): boolean => !label()?.hasAttribute('inert')

  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...FAKED] })
    act(() => notifyDeleted('Ideas', vi.fn()))
    const el = label() as HTMLElement
    el.getBoundingClientRect = () => ({ left: 100, top: 0, right: 300, bottom: 40 }) as DOMRect
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stalls within its band and drains once the pointer leaves it', () => {
    move(400)
    run(10_000)
    expect(showing()).toBe(true)
    move(401)
    run(10_000)
    expect(showing()).toBe(false)
  })

  it('holds where it stands through a press', () => {
    move(400)
    move(1000, 1)
    run(10_000)
    expect(showing()).toBe(true)
  })
})
