// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import {
  buildPageIndex,
  type ConnectionsApi,
  type ConnPage,
} from '@renderer/MarkdownPM/Connections'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/Testing/editorHarness'

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
  // behavior removed. Live check only.
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

  // Same clamping, other symptom: the caret would land mid-alias, in text the pointer never
  // touched. It belongs at the bracket edge nearest where the click actually was.
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

// The edge seat above exists because a hidden marker is zero width and coordinates beside a link
// therefore clamp into it. That reasoning covers exactly the links that hide something. These two
// don't resolve, and the seat has to tell them apart rather than treating "no page" as "no hit".
describe('a link that leads nowhere still takes the caret where it was pressed', () => {
  const ambiguous: ConnectionsApi = {
    ...buildPageIndex([
      { id: 'b1', title: 'Beta', path: 'Notes/Beta.md' },
      { id: 'b2', title: 'Beta', path: 'Other/Beta.md' },
    ]),
    open: (p: ConnPage) => opened(p.id),
  }

  // These two assert the seat DIDN'T fire, never where the caret ended up instead: declining leaves
  // the press to CM, whose own seat needs coordinates jsdom can't produce and lands on the doc end
  // in every case. Both bracket edges are excluded, since which one is nearer isn't the point.
  const bracketEdges = [2, 10]

  // A phantom is drawn as its own raw bracketed text — every character has width, so nothing can
  // clamp in from beside it and the press means exactly where it landed.
  it('a press inside an unresolved link is left to the editor', async () => {
    const view = await mountEditor({ initialBody: 'a [[Zeta]] b', connections: conn })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(7)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(bracketEdges).not.toContain(view.state.selection.main.head)
  })

  // An ambiguous link hides its brackets like a resolved one, so it keeps the edge seat — but its
  // own drawn text has to be recognized as drawn text. `a [[Beta]] b` draws its content over [4,8].
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
