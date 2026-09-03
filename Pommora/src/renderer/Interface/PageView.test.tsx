// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSession } from '../store'
import { EditorView } from '@codemirror/view'
import { PageView } from './PageView'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  class RO {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= RO
  const empty = { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) }
  ;(window as unknown as { nexus: unknown }).nexus = {
    headingIcon: empty,
    folds: empty,
    embedHeights: empty,
    embedZooms: empty,
    tableHeadingColumns: empty,
    setEditorFormatState: vi.fn(),
    onMenuAction: vi.fn(() => () => undefined),
    titleMenu: vi.fn(),
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  vi.useRealTimers()
  await act(async () => root.unmount())
  container.remove()
})

const slot = (detailBody: string, liveBody: string) => ({
  a: {
    status: 'ready' as const,
    target: { kind: 'page' as const, id: 'a', path: 'Notes/a.md' },
    detail: { id: 'a', title: 'A', path: 'Notes/a.md', frontmatter: {}, body: detailBody },
    body: liveBody,
  },
})

describe('PageView seeds its editor from the slot', () => {
  it('a cold mount shows the live body, not the load snapshot', async () => {
    useSession.setState({ tree: null, pages: slot('stale', 'live') })
    await act(async () => {
      root.render(createElement(PageView, { tabId: 't1', pageId: 'a' }))
    })
    expect(container.querySelector('.cm-content')?.textContent).toBe('live')
  })

  it('lands a live body still inside its debounce when the view unmounts', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    useSession.setState({ tree: null, pages: slot('live', 'live') })
    await act(async () => {
      root.render(createElement(PageView, { tabId: 't1', pageId: 'a' }))
    })
    const editor = container.querySelector('.cm-editor') as HTMLElement
    const view = EditorView.findFromDOM(editor)
    await act(async () => {
      view?.dispatch({ changes: { from: 0, insert: 'x' } })
    })
    await act(async () => root.render(null))
    const slotAfter = useSession.getState().pages.a
    expect(slotAfter?.status === 'ready' && slotAfter.body).toBe('xlive')
  })
})
