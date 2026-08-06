// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ConnectionHoverCard, hoverConnection } from './ConnectionHoverCard'
import { useSession } from '../store'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const page = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  useSession.setState({ activeTabId: 'tab-1' })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<ConnectionHoverCard />))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  for (const n of document.querySelectorAll('[data-picker-portal]')) n.remove()
})

const link = (): HTMLElement => {
  const el = document.createElement('span')
  document.body.appendChild(el)
  return el
}
const cardOpen = (): boolean => document.querySelector('[data-picker-portal]') !== null

describe('the hover entry', () => {
  it('opens for a connected element', () => {
    act(() => hoverConnection(page, link()))
    expect(cardOpen()).toBe(true)
  })

  it('a detached element is a no-op — the orphaned intent timer cannot open a corner card', () => {
    const el = link()
    el.remove()
    act(() => hoverConnection(page, el))
    expect(cardOpen()).toBe(false)
  })

  it('navigation closes an open card', () => {
    vi.useFakeTimers()
    try {
      act(() => hoverConnection(page, link()))
      expect(cardOpen()).toBe(true)
      act(() => useSession.setState({ activeTabId: 'tab-2' }))
      // The portal outlives the close through the exit animation — run it out.
      act(() => vi.advanceTimersByTime(500))
      expect(cardOpen()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
