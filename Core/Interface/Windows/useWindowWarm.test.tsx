// @vitest-environment jsdom
import { detail } from '@pommora/core/Testing/fixtures'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { cachePageDetail, clearCache } from '../../Session/pageDetailCache'
import { useSession } from '../../Session/store'
import { useWindowWarm, windowSeam } from './useWindowWarm'
import { captureBodyScroll, clearWindowCache, WINDOW_OWNER } from './windowCache'
import { captureWarm, readWarm } from '../../Session/warmCache'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

function ScrollProbe({ el, ready }: { el: HTMLElement; ready: boolean }): null {
  const ref = useRef<HTMLElement | null>(el)
  useWindowWarm(ref, ready)
  return null
}

const scroller = (): HTMLElement => {
  const el = document.createElement('div')
  el.style.cssText = 'height:100px;overflow:auto'
  const inner = document.createElement('div')
  inner.style.height = '1000px'
  el.append(inner)
  container.append(el)
  return el
}

const twoFrames = (): Promise<void> =>
  act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
  })

const onSpaceTab = (): void =>
  useSession.setState({
    windowSlot: {
      kind: 'page',
      tabs: [{ id: 'tab1', target: { kind: 'space', id: 'sp' } }],
      activeTabId: 'tab1',
    },
  })

beforeEach(() => {
  clearCache()
  clearWindowCache()
  useSession.setState({
    windowSlot: {
      kind: 'page',
      tabs: [{ id: 'tab1', target: { kind: 'page', id: 'a', path: 'Notes/a.md' } }],
      activeTabId: 'tab1',
    },
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('useWindowWarm', () => {
  it("fences the active tab's entry against the active path's known body, dropping a stale one", () => {
    captureWarm(WINDOW_OWNER, 'tab1', { editorState: { doc: 'old' }, scrollTop: 0 })
    cachePageDetail(detail({ id: 'a', title: 'A', path: 'Notes/a.md', body: 'new' }))
    const seam = windowSeam('tab1', 'Notes/a.md')
    expect(seam.restore()).toBeUndefined()
    expect(readWarm(WINDOW_OWNER, 'tab1')).toBeUndefined()
    captureWarm(WINDOW_OWNER, 'tab1', { editorState: { doc: 'new' }, scrollTop: 0 })
    expect(seam.restore()).toEqual({ editorState: { doc: 'new' }, scrollTop: 0 })
  })

  it("restores the active tab's scroll for a tab carrying no page", async () => {
    onSpaceTab()
    captureBodyScroll('tab1', 240)
    const el = scroller()
    await act(async () => {
      root.render(createElement(ScrollProbe, { el, ready: true }))
    })
    await twoFrames()
    expect(el.scrollTop).toBe(240)
  })

  it('restores a scroller once, so a parked page returning, or a heading arrival on it, keeps its place', async () => {
    captureBodyScroll('tab1', 240)
    const el = scroller()
    await act(async () => {
      root.render(createElement(ScrollProbe, { el, ready: true }))
    })
    await twoFrames()
    expect(el.scrollTop).toBe(240)
    el.scrollTop = 500
    const activate = (activeTabId: string): Promise<void> =>
      act(async () => {
        useSession.setState((s) => ({
          windowSlot: s.windowSlot && { ...s.windowSlot, activeTabId },
        }))
      })
    await activate('tab2')
    await activate('tab1')
    await twoFrames()
    expect(el.scrollTop).toBe(500)
  })

  it('holds the restore until the tab is ready, then lands it', async () => {
    onSpaceTab()
    captureBodyScroll('tab1', 240)
    const el = scroller()
    await act(async () => {
      root.render(createElement(ScrollProbe, { el, ready: false }))
    })
    await twoFrames()
    expect(el.scrollTop).toBe(0)
    await act(async () => {
      root.render(createElement(ScrollProbe, { el, ready: true }))
    })
    await twoFrames()
    expect(el.scrollTop).toBe(240)
  })
})
