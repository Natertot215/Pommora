// @vitest-environment jsdom
import { detail } from '@pommora/core/Testing/fixtures'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { WarmSeam } from '../../MarkdownPM/warmSeam'
import { cachePageDetail, clearCache } from '../../Session/pageDetailCache'
import { useSession } from '../../Session/store'
import { useWindowWarm } from './useWindowWarm'
import { captureWindowCache, clearWindowCache } from './windowCache'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
let seam: WarmSeam | undefined

function Probe({ path }: { path: string }): null {
  const ref = useRef<HTMLDivElement | null>(null)
  seam = useWindowWarm(ref, path, true)
  return null
}

function ScrollProbe({ el, ready }: { el: HTMLElement; ready: boolean }): null {
  const ref = useRef<HTMLElement | null>(el)
  useWindowWarm(ref, undefined, ready)
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
    pageWindow: {
      kind: 'page',
      tabs: [{ id: 'tab1', target: { kind: 'space', id: 'sp' } }],
      activeTabId: 'tab1',
    },
  })

beforeEach(() => {
  clearCache()
  clearWindowCache()
  useSession.setState({
    pageWindow: {
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
  it("fences the active tab's entry against the active path's fresh detail", async () => {
    captureWindowCache('tab1', { editorState: { doc: 'old' }, scrollTop: 0 })
    cachePageDetail(detail({ id: 'a', title: 'A', path: 'Notes/a.md', body: 'new' }))
    await act(async () => {
      root.render(createElement(Probe, { path: 'Notes/a.md' }))
    })
    expect(seam?.restore()).toBeUndefined()
    cachePageDetail(detail({ id: 'a', title: 'A', path: 'Notes/a.md', body: 'old' }))
    expect(seam?.restore()).toEqual({ editorState: { doc: 'old' }, scrollTop: 0 })
  })

  it("restores the active tab's scroll for a tab carrying no page", async () => {
    onSpaceTab()
    captureWindowCache('tab1', { bodyScrollTop: 240 })
    const el = scroller()
    await act(async () => {
      root.render(createElement(ScrollProbe, { el, ready: true }))
    })
    await twoFrames()
    expect(el.scrollTop).toBe(240)
  })

  it('holds the restore until the tab is ready, then lands it', async () => {
    onSpaceTab()
    captureWindowCache('tab1', { bodyScrollTop: 240 })
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
