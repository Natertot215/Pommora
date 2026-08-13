// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi, type ConnPage } from '@renderer/MarkdownPM/connections'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

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

// `a [[Alpha]] b` — token [2,11], the displayed title [4,9]. jsdom measures nothing, so the click
// point is pinned through posAtCoords.
//
// The mousedown and the caret seat are not ceremony: CM moves the caret on mousedown, so a bare
// click() dispatch tests a sequence the app never runs — and a rule reading the live caret passes
// here while failing on every real click.
// The span is re-queried before each dispatch, never captured: seating the caret activates the
// token, which changes its class, and CM answers that by REPLACING the element. A held reference is
// detached by then, and an event dispatched on it never reaches the editor's handlers at all.
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

  // NOT covered here: that a navigating press refuses the caret seat. CM seats the caret from real
  // coordinates, which jsdom never produces, and `defaultPrevented` reads true at every position
  // because CM prevents default on its own content — so any assertion about it passes with the
  // behaviour removed. Live check only.
  it('a link the caret was already inside when pressed does not navigate', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => view.focus())
    clickAt(view, 6, 6)
    expect(opened).not.toHaveBeenCalled()
  })

  // The bug a coordinate check alone can't catch: posAtCoords clamps to the nearest RENDERED
  // position and the closing `]]` is replaced to zero width, so a click in the blank space past a
  // short alias resolves back onto its last character. Only the event's target knows the pointer
  // was never on the link — so this dispatches off the span while the offset says otherwise.
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
