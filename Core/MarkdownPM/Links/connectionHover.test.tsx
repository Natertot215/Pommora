// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from './connectionsApi'
import type { EditorHost } from '../api'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

stubEditorBridge()
const arm = vi.fn()
const cancel = vi.fn()
const glance: NonNullable<EditorHost['glance']> = {
  arm,
  cancel,
  close: () => {},
  contains: (el) => el.closest('[data-glance]') !== null,
}
beforeEach(() => {
  arm.mockClear()
  cancel.mockClear()
})
afterEach(async () => {
  await cleanupEditor()
})

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}
const TARGET = { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' }

// jsdom draws no layout, so posAtCoords can't hit-test — the pin has to be inside the displayed title's content span, since the edges beside the syntax are left to caret placement.
async function mountLink(): Promise<{ view: EditorView; span: HTMLElement }> {
  const view = await mountEditor({ initialBody: '[[Alpha]]', connections: conn, host: { glance } })
  vi.spyOn(view, 'posAtCoords').mockReturnValue(4)
  const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
  expect(span).toBeTruthy()
  return { view, span }
}

const over = (span: HTMLElement): void => {
  span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
}

describe('the connection dwell', () => {
  it('arms the host with the page and the link element in hand', async () => {
    const { span } = await mountLink()
    over(span)
    expect(arm).toHaveBeenCalledTimes(1)
    expect(arm).toHaveBeenCalledWith(TARGET, span)
  })

  it('a click consumes it — the host is told to stand down', async () => {
    const { span } = await mountLink()
    over(span)
    span.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    expect(cancel).toHaveBeenCalled()
  })

  it('a context-menu consumes it the same way', async () => {
    const { span } = await mountLink()
    over(span)
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    expect(cancel).toHaveBeenCalled()
  })

  it('re-entry over a link that was just acted on does not re-arm', async () => {
    const { span } = await mountLink()
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    over(span)
    expect(arm).not.toHaveBeenCalled()
  })

  it('leaving the link clears that, so a later dwell works', async () => {
    const { span } = await mountLink()
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    over(span)
    expect(arm).toHaveBeenCalledTimes(1)
  })

  it('mouseout cancels; re-entry re-arms fresh', async () => {
    const { span } = await mountLink()
    over(span)
    span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    expect(cancel).toHaveBeenCalled()
    over(span)
    expect(arm).toHaveBeenCalledTimes(2)
  })

  it('a host without a glance arms nothing', async () => {
    const view = await mountEditor({
      initialBody: '[[Alpha]]',
      connections: conn,
      host: { glance: false },
    })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(4)
    const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    over(span)
    expect(arm).not.toHaveBeenCalled()
  })
})

describe('inside a glance', () => {
  afterEach(() => document.body.removeAttribute('data-glance'))

  it('neither a page link nor a website link follows on click', async () => {
    document.body.setAttribute('data-glance', '')
    const open = vi.fn()
    const openExternal = vi.fn()
    ;(window as unknown as { nexus: Record<string, unknown> }).nexus.openExternal = openExternal
    const view = await mountEditor({
      initialBody: '[[Alpha]] and [site](https://example.com)',
      connections: { ...conn, open },
      host: { glance },
    })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(4)
    const page = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    page.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    vi.spyOn(view, 'posAtCoords').mockReturnValue(16)
    const site = view.dom.querySelector('.md-link') as HTMLElement
    site.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    expect(open).not.toHaveBeenCalled()
    expect(openExternal).not.toHaveBeenCalled()
  })
})

describe('read-only autocomplete gate', () => {
  const coords = { left: 10, right: 10, top: 10, bottom: 20 }
  it('a caret seated inside a link opens the picker only when the editor can edit', async () => {
    const editable = await mountEditor({ initialBody: '[[Alph]]', connections: conn })
    vi.spyOn(editable, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => editable.dispatch({ selection: { anchor: 3 } }))
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await cleanupEditor()

    const locked = await mountEditor({ initialBody: '[[Alph]]', connections: conn, readOnly: true })
    vi.spyOn(locked, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => locked.dispatch({ selection: { anchor: 3 } }))
    expect(document.querySelector('.mdpm-ac')).toBeNull()
  })
})
