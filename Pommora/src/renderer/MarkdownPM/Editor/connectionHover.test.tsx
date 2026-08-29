// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { CONN_HOVER_INTENT_MS } from '@renderer/MarkdownPM/Editor/pointerPath'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/Testing/editorHarness'

// Derived from the dwell rather than restated: these tests are about arm/cancel ordering, and
// hard-coded milliseconds turn a tuned knob into a red suite.
const PAST_DWELL = CONN_HOVER_INTENT_MS + 50
const MID_DWELL = Math.floor(CONN_HOVER_INTENT_MS / 2)

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
    vi.advanceTimersByTime(PAST_DWELL)
    expect(hover).toHaveBeenCalledTimes(1)
    expect(hover.mock.calls[0][1]).toBe(span)
  })

  it('a click inside the window consumes it — nothing fires afterward', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(MID_DWELL)
    span.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    vi.advanceTimersByTime(PAST_DWELL)
    expect(hover).not.toHaveBeenCalled()
  })

  it('a context-menu inside the window consumes it the same way', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(MID_DWELL)
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    vi.advanceTimersByTime(PAST_DWELL)
    expect(hover).not.toHaveBeenCalled()
  })

  // A native menu takes the pointer and hands it back over the same link, and that re-entry is a
  // fresh mouseover — cancelling once would let a preview bloom behind the menu just used.
  it('re-entry over a link that was just acted on does not re-arm', async () => {
    const { span } = await mountLink()
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    over(span)
    vi.advanceTimersByTime(PAST_DWELL)
    expect(hover).not.toHaveBeenCalled()
  })

  it('leaving the link clears that, so a later dwell works', async () => {
    const { span } = await mountLink()
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    over(span)
    vi.advanceTimersByTime(PAST_DWELL)
    expect(hover).toHaveBeenCalledTimes(1)
  })

  it('mouseout cancels; re-entry re-arms fresh', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(MID_DWELL)
    span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    vi.advanceTimersByTime(PAST_DWELL)
    expect(hover).not.toHaveBeenCalled()
    over(span)
    vi.advanceTimersByTime(PAST_DWELL)
    expect(hover).toHaveBeenCalledTimes(1)
  })
})

describe('read-only autocomplete gate', () => {
  const coords = { left: 10, right: 10, top: 10, bottom: 20 }
  // A PARTIAL title, deliberately: a complete one suggests only itself, and the picker stands down
  // rather than offer a no-op — which would make this pass for the wrong reason.
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
