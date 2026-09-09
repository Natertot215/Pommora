// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ConnectionsApi } from './connectionsApi'
import { buildPageIndex, type ConnPage } from '@pommora/core/Connections/pageIndex'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

stubEditorBridge()
afterEach(async () => {
  await cleanupEditor()
})

const opened = vi.fn()
const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: (p: ConnPage) => opened(p.id),
}

// jsdom measures nothing, so the click point is pinned through posAtCoords; the span is re-queried before each dispatch, since seating the caret changes its class and CM replaces the element.
const linkSpan = (view: EditorView): HTMLElement =>
  (view.dom.querySelector('.md-connection-resolved') ?? view.dom) as HTMLElement

const clickAt = (view: EditorView, pos: number, caretBefore = 0): void => {
  view.dispatch({ selection: { anchor: caretBefore } })
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  linkSpan(view).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
  view.dispatch({ selection: { anchor: pos } })
  linkSpan(view).dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
}

describe('a connection acts on its text, and leaves its edges to the caret', () => {
  it('a click on the link text navigates', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => view.focus())
    clickAt(view, 6)
    expect(opened).toHaveBeenCalledWith('p1')
  })

  it('a link the caret was already inside when pressed does not navigate', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => view.focus())
    clickAt(view, 6, 6)
    expect(opened).not.toHaveBeenCalled()
  })

  it('a click in the space past a link does not follow it', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(9)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    view.contentDOM.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    expect(opened).not.toHaveBeenCalled()
  })

  it('a click that clamps into a resting link seats at the nearer bracket edge', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(9)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(view.state.selection.main.head).toBe(11)

    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(4)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(view.state.selection.main.head).toBe(2)
  })

  it('a click at the leading edge does not navigate', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    clickAt(view, 2)
    expect(opened).not.toHaveBeenCalled()
  })

  it('a click at the trailing edge does not navigate', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    clickAt(view, 11)
    expect(opened).not.toHaveBeenCalled()
  })

  it('both content bounds still count as the link itself', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    for (const pos of [4, 9]) {
      opened.mockClear()
      clickAt(view, pos)
      expect(opened).toHaveBeenCalledWith('p1')
    }
  })
})

describe('a link that leads nowhere still takes the caret where it was pressed', () => {
  const ambiguous: ConnectionsApi = {
    ...buildPageIndex([
      { id: 'b1', title: 'Beta', path: 'Notes/Beta.md' },
      { id: 'b2', title: 'Beta', path: 'Other/Beta.md' },
    ]),
    open: (p: ConnPage) => opened(p.id),
  }

  const bracketEdges = [2, 10]

  it('a press inside an unresolved link is left to the editor', async () => {
    const view = await mountEditor({ initialBody: 'a [[Zeta]] b', connections: conn })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(7)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(bracketEdges).not.toContain(view.state.selection.main.head)
  })

  it('a press on an ambiguous link’s text is left to the editor', async () => {
    const view = await mountEditor({ initialBody: 'a [[Beta]] b', connections: ambiguous })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(6)
    const span = view.dom.querySelector('.md-connection-ambiguous') as HTMLElement
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(bracketEdges).not.toContain(view.state.selection.main.head)
  })

  it('but one still seats at the nearer edge when the press clamped in from beside it', async () => {
    const view = await mountEditor({ initialBody: 'a [[Beta]] b', connections: ambiguous })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(8)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(view.state.selection.main.head).toBe(10)
  })
})
