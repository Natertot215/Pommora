// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

stubEditorBridge()
beforeEach(() => {
  vi.useFakeTimers()
  hover.mockClear()
})
afterEach(async () => {
  vi.useRealTimers()
  await cleanupEditor()
})

const hover = vi.fn()
const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
  hover,
}

// jsdom draws no layout, so posAtCoords can't hit-test — pin it to the link's first character.
// The link starts the doc, so position 0 sits inside the wikiLink token either way.
async function mountLink(): Promise<{ view: EditorView; span: HTMLElement }> {
  const view = await mountEditor({ initialBody: '[[Alpha]]', connections: conn })
  vi.spyOn(view, 'posAtCoords').mockReturnValue(0)
  const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
  expect(span).toBeTruthy()
  return { view, span }
}

const over = (span: HTMLElement): void => {
  span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
}

describe('the hover intent', () => {
  it('fires after the delay with the link element in hand', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(500)
    expect(hover).toHaveBeenCalledTimes(1)
    expect(hover.mock.calls[0][1]).toBe(span)
  })

  it('a click inside the window consumes it — nothing fires afterward', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(300)
    span.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    vi.advanceTimersByTime(500)
    expect(hover).not.toHaveBeenCalled()
  })

  it('a context-menu inside the window consumes it the same way', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(300)
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    vi.advanceTimersByTime(500)
    expect(hover).not.toHaveBeenCalled()
  })

  it('mouseout cancels; re-entry re-arms fresh', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(300)
    span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    vi.advanceTimersByTime(500)
    expect(hover).not.toHaveBeenCalled()
    over(span)
    vi.advanceTimersByTime(500)
    expect(hover).toHaveBeenCalledTimes(1)
  })
})
