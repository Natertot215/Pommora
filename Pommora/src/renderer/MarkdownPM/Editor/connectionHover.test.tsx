// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, glanceLink, type ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import {
  GLANCE_DWELL,
  cancelGlance,
  setGlancePresenter,
} from '@renderer/Interface/Glance/glanceAction'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/Testing/editorHarness'

// Derived from the dwell rather than restated: these tests are about arm/cancel ordering, and
// hard-coded milliseconds turn a tuned knob into a red suite.
const PAST_DWELL = GLANCE_DWELL.link + 50
const MID_DWELL = Math.floor(GLANCE_DWELL.link / 2)

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

stubEditorBridge()
// The real hook against the real seam, with only the pane's presenter stubbed: what these tests
// assert is that the dwell FIRES through the editor's whole pointer path — four pointer handlers
// share one editor, and only the one that armed may decide whether it survives.
const present = vi.fn()
beforeEach(() => {
  vi.useFakeTimers()
  present.mockClear()
  setGlancePresenter(present)
})
afterEach(async () => {
  cancelGlance()
  setGlancePresenter(null)
  vi.useRealTimers()
  await cleanupEditor()
})

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
  glance: glanceLink,
}

// jsdom draws no layout, so posAtCoords can't hit-test — pin it inside the displayed title. It has
// to be the content span, not the token's start: the edges beside the syntax are left to caret
// placement, so a pin at 0 would suppress the very dwell these tests assert.
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

describe('the connection dwell', () => {
  it('fires exactly once after the delay with the link element in hand', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(MID_DWELL)
    expect(present).not.toHaveBeenCalled()
    vi.advanceTimersByTime(PAST_DWELL)
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith({
      target: { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' },
      el: span,
    })
  })

  it('a click inside the window consumes it — nothing fires afterward', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(MID_DWELL)
    span.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    vi.advanceTimersByTime(PAST_DWELL)
    expect(present).not.toHaveBeenCalled()
  })

  it('a context-menu inside the window consumes it the same way', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(MID_DWELL)
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    vi.advanceTimersByTime(PAST_DWELL)
    expect(present).not.toHaveBeenCalled()
  })

  // A native menu hands the pointer back over the same link, and that re-entry is a fresh mouseover.
  it('re-entry over a link that was just acted on does not re-arm', async () => {
    const { span } = await mountLink()
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    over(span)
    vi.advanceTimersByTime(PAST_DWELL)
    expect(present).not.toHaveBeenCalled()
  })

  it('leaving the link clears that, so a later dwell works', async () => {
    const { span } = await mountLink()
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    over(span)
    vi.advanceTimersByTime(PAST_DWELL)
    expect(present).toHaveBeenCalledTimes(1)
  })

  it('mouseout cancels; re-entry re-arms fresh', async () => {
    const { span } = await mountLink()
    over(span)
    vi.advanceTimersByTime(MID_DWELL)
    span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    vi.advanceTimersByTime(PAST_DWELL)
    expect(present).not.toHaveBeenCalled()
    over(span)
    vi.advanceTimersByTime(PAST_DWELL)
    expect(present).toHaveBeenCalledTimes(1)
  })

  it('a body without the hook arms nothing — the glance never glances itself', async () => {
    const { glance: _omitted, ...bare } = conn
    const view = await mountEditor({ initialBody: '[[Alpha]]', connections: bare })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(4)
    const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    over(span)
    vi.advanceTimersByTime(PAST_DWELL)
    expect(present).not.toHaveBeenCalled()
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
  // A partial title, deliberately: a complete one suggests only itself, and the picker stands down.
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
