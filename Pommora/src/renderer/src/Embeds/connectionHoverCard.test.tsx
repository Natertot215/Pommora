// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ConnectionHoverCard, hoverConnection } from './ConnectionHoverCard'
import { cachePageDetail, dropPageDetail } from '../Tabs/warmCache'
import { useSession } from '../store'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const page = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }
const detail = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md', frontmatter: {}, body: 'hi' }

/** The bridge a mounted preview reads. The editor inside it takes the native-menu seam like every
 *  other surface, so every stub carries those two channels whatever else a test drives. */
const stubNexus = (extra: Record<string, unknown>): void => {
  ;(window as unknown as { nexus: unknown }).nexus = {
    setEditorFormatState: () => {},
    onMenuAction: () => () => {},
    ...extra,
  }
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  useSession.setState({ activeTabId: 'tab-1' })
  stubNexus({
    hoverCard: {
      load: async () => ({ ok: true, value: null }),
      save: async () => ({ ok: true, value: null }),
    },
  })
  cachePageDetail(detail)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<ConnectionHoverCard />))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  dropPageDetail(page.path)
  for (const n of document.querySelectorAll('[data-picker-portal]')) n.remove()
})

const link = (): HTMLElement => {
  const el = document.createElement('span')
  document.body.appendChild(el)
  return el
}
const cardOpen = (): boolean => document.querySelector('[data-picker-portal]') !== null
const flush = async (): Promise<void> => await act(async () => {})

describe('the hover entry', () => {
  it('a warm page opens synchronously', () => {
    act(() => hoverConnection(page, link()))
    expect(cardOpen()).toBe(true)
  })

  it('a detached element is a no-op — the orphaned intent timer cannot open a corner card', () => {
    const el = link()
    el.remove()
    act(() => hoverConnection(page, el))
    expect(cardOpen()).toBe(false)
  })

  it('a cold page opens only once its fetch lands, still under the pointer', async () => {
    dropPageDetail(page.path)
    stubNexus({ openPage: async () => ({ ok: true, value: detail }) })
    const el = link()
    const hoverSpy = vi.spyOn(el, 'matches').mockReturnValue(true)
    act(() => hoverConnection(page, el))
    expect(cardOpen()).toBe(false)
    await flush()
    expect(hoverSpy).toHaveBeenCalledWith(':hover')
    expect(cardOpen()).toBe(true)
  })

  it('a flick-away during the fetch opens nothing', async () => {
    dropPageDetail(page.path)
    stubNexus({ openPage: async () => ({ ok: true, value: detail }) })
    const el = link()
    vi.spyOn(el, 'matches').mockReturnValue(false)
    act(() => hoverConnection(page, el))
    await flush()
    expect(cardOpen()).toBe(false)
  })

  it('a failed open blooms nothing', async () => {
    dropPageDetail(page.path)
    stubNexus({ openPage: async () => ({ ok: false, error: { code: 'io', message: 'gone' } }) })
    act(() => hoverConnection(page, link()))
    await flush()
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
