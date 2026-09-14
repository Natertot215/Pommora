// @vitest-environment jsdom
import { detail } from '@pommora/core/Testing/fixtures'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@pommora/core/Contract/result'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSession } from '../Session/store'
import { EditorView } from '@codemirror/view'
import { PageView } from './PageView'
import { stubDialer } from '../vitest.setup'
import { undo } from '@codemirror/commands'
import { machine } from '../Platform/machine'
import {
  cachePageDetail,
  clearCache,
  dropPageDetail,
  notifyLanding,
} from '../Session/pageDetailCache'
import { flushPageSave, setStaleSaveSink } from '../Session/saveScheduler'

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
  clearCache()
  onDisk = 'live'
  updateReply = { ok: true, value: { hash: machine().sha256Hex('live'), stale: false } }
  captured = vi.fn(async () => ok(null))
  updated = vi.fn(async () => updateReply)
  const empty = { get: vi.fn(async () => ok({})), set: vi.fn(async () => undefined) }
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'headingIcon:get': empty.get,
    'headingIcon:set': empty.set,
    'folds:get': empty.get,
    'folds:set': empty.set,
    'embedHeights:get': empty.get,
    'embedHeights:set': empty.set,
    'embedZooms:get': empty.get,
    'embedZooms:set': empty.set,
    'tableHeadingCols:get': empty.get,
    'tableHeadingCols:set': empty.set,
    'page:open': vi.fn(async (path: string) => ok(detail({ id: 'a', path, body: onDisk }))),
    'page:updateBody': updated,
    'sync:captureLocal': captured,
    'editor:format-state': vi.fn(),
    'menu:action': vi.fn(() => () => undefined),
    menu: vi.fn(async () => ok(null)),
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  setStaleSaveSink(null)
  clearCache()
  vi.useRealTimers()
  await act(async () => root.unmount())
  container.remove()
})

let onDisk: string
let updateReply: unknown
let captured: ReturnType<typeof vi.fn>
let updated: ReturnType<typeof vi.fn>

const PATH = 'Notes/a.md'

const viewOf = (): EditorView =>
  EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement) as EditorView

const slot = (detailBody: string, liveBody: string) => ({
  a: {
    status: 'ready' as const,
    target: { kind: 'page' as const, id: 'a', path: 'Notes/a.md' },
    detail: detail({ id: 'a', title: 'A', path: 'Notes/a.md', body: detailBody }),
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

describe('a landing under the open page', () => {
  const BASE = 'alpha\nbeta\ngamma'

  const mount = async (): Promise<EditorView> => {
    cachePageDetail(detail({ id: 'a', path: PATH, body: BASE }))
    useSession.setState({ tree: null, pages: slot(BASE, BASE) })
    await act(async () => {
      root.render(createElement(PageView, { tabId: 't1', pageId: 'a' }))
    })
    return viewOf()
  }

  it('merges a landing around the caret without an undo entry', async () => {
    const view = await mount()
    onDisk = `${BASE}\ndelta`
    await act(async () => {
      view.dispatch({ changes: { from: 5, insert: ' ONE' }, selection: { anchor: 9 } })
    })
    const head = view.state.selection.main.head
    await act(async () => {
      notifyLanding(PATH)
    })
    expect(view.state.doc.toString()).toBe('alpha ONE\nbeta\ngamma\ndelta')
    expect(view.state.selection.main.head).toBe(head)
    act(() => {
      undo(view)
    })
    expect(view.state.doc.toString()).toBe('alpha\nbeta\ngamma\ndelta')
    expect(captured).not.toHaveBeenCalled()
  })

  it('captures the buffer and takes remote when no base is held', async () => {
    const view = await mount()
    onDisk = `${BASE}\ndelta`
    await act(async () => {
      view.dispatch({ changes: { from: 5, insert: ' ONE' } })
    })
    const local = view.state.doc.toString()
    dropPageDetail(PATH)
    await act(async () => {
      notifyLanding(PATH)
    })
    expect(captured).toHaveBeenCalledWith(PATH, local)
    expect(view.state.doc.toString()).toBe(onDisk)
  })

  it('saves the merged text when the dispatch is a no-op', async () => {
    const view = await mount()
    onDisk = BASE
    await act(async () => {
      view.dispatch({ changes: { from: 5, insert: ' ONE' } })
    })
    const local = view.state.doc.toString()
    updated.mockClear()
    await act(async () => {
      notifyLanding(PATH)
    })
    expect(view.state.doc.toString()).toBe(local)
    await act(async () => {
      await flushPageSave(PATH)
    })
    expect(updated).toHaveBeenCalledWith(PATH, local, machine().sha256Hex(BASE))
  })

  it('routes a stale save through the same merge', async () => {
    const view = await mount()
    setStaleSaveSink(notifyLanding)
    onDisk = `${BASE}\ndelta`
    updateReply = { ok: true, value: { hash: machine().sha256Hex(onDisk), stale: true } }
    await act(async () => {
      view.dispatch({ changes: { from: 5, insert: ' ONE' } })
    })
    await act(async () => {
      await flushPageSave(PATH)
    })
    expect(view.state.doc.toString()).toBe('alpha ONE\nbeta\ngamma\ndelta')
  })
})
