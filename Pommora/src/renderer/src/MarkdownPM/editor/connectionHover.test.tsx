// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

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

// jsdom draws no layout, so posAtCoords can't hit-test — pin it inside the displayed title. It has
// to be the CONTENT span rather than the token's start: the edges beside the syntax are left to
// caret placement, so a pin at 0 suppresses the very hover these tests assert.
async function mountLink(): Promise<{ view: EditorView; span: HTMLElement }> {
  const view = await mountEditor({ initialBody: '[[Alpha]]', connections: conn })
  vi.spyOn(view, 'posAtCoords').mockReturnValue(4)
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

  // A native menu takes the pointer and hands it back over the same link, and that re-entry is a
  // fresh mouseover — cancelling once would let a preview bloom behind the menu just used.
  it('re-entry over a link that was just acted on does not re-arm', async () => {
    const { span } = await mountLink()
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    over(span)
    vi.advanceTimersByTime(1000)
    expect(hover).not.toHaveBeenCalled()
  })

  it('leaving the link clears that, so a later dwell works', async () => {
    const { span } = await mountLink()
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    over(span)
    vi.advanceTimersByTime(1000)
    expect(hover).toHaveBeenCalledTimes(1)
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

describe('read-only autocomplete gate', () => {
  const coords = { left: 10, right: 10, top: 10, bottom: 20 }
  it('a caret seated inside a link opens the picker only when the editor can edit', async () => {
    const editable = await mountEditor({ initialBody: '[[Alpha]]', connections: conn })
    vi.spyOn(editable, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => editable.dispatch({ selection: { anchor: 3 } }))
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await cleanupEditor()

    const locked = await mountEditor({ initialBody: '[[Alpha]]', connections: conn, readOnly: true })
    vi.spyOn(locked, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => locked.dispatch({ selection: { anchor: 3 } }))
    expect(document.querySelector('.mdpm-ac')).toBeNull()
  })
})
