// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { WarmSeam } from '@renderer/MarkdownPM/warmSeam'
import { cachePageDetail, clearCache } from '../Store/tabState'
import { useSession } from '../store'
import { useWindowWarm } from './useWindowWarm'
import { captureWindowCache, clearWindowCache } from './windowCache'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
let seam: WarmSeam | undefined

function Probe({ path }: { path: string }): null {
  const ref = useRef<HTMLDivElement | null>(null)
  seam = useWindowWarm(ref, path)
  return null
}

beforeEach(() => {
  clearCache()
  clearWindowCache()
  useSession.setState({
    preview: {
      flavor: 'page',
      originId: 'a',
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
  it('does not restore an entry whose doc differs from the fresh detail', async () => {
    captureWindowCache('tab1', { editorState: { doc: 'old' }, scrollTop: 0 })
    cachePageDetail({ id: 'a', title: 'A', path: 'Notes/a.md', frontmatter: {}, body: 'new' })
    await act(async () => {
      root.render(createElement(Probe, { path: 'Notes/a.md' }))
    })
    expect(seam?.restore()).toBeUndefined()
    cachePageDetail({ id: 'a', title: 'A', path: 'Notes/a.md', frontmatter: {}, body: 'old' })
    expect(seam?.restore()).toEqual({ editorState: { doc: 'old' }, scrollTop: 0 })
  })
})
