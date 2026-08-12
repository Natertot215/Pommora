// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
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
// point is pinned through posAtCoords; the offsets are what a real click would resolve to.
const clickAt = (view: EditorView, pos: number): void => {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  const target = (view.dom.querySelector('.md-connection-resolved') ?? view.dom) as HTMLElement
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
}

describe('a connection acts on its text, and leaves its edges to the caret', () => {
  it('a click on the link text navigates', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    clickAt(view, 6)
    expect(opened).toHaveBeenCalledWith('p1')
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
