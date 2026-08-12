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
const clickAt = (view: EditorView, pos: number, caretBefore = 0): void => {
  view.dispatch({ selection: { anchor: caretBefore } })
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  const target = (view.dom.querySelector('.md-connection-resolved') ?? view.dom) as HTMLElement
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
  view.dispatch({ selection: { anchor: pos } })
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
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
