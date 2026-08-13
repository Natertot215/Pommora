// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const openExternal = vi.fn()
stubEditorBridge({ openExternal })

beforeEach(() => openExternal.mockReset())
afterEach(async () => {
  await cleanupEditor()
})

// `a [Home](https://x.test) b` — the token spans [2,25] and the label `Home` is drawn over [3,7],
// which at rest is the only part of it with any width: `[` and `](url)` are replaced away.
//
// Opening a link is the one gesture in the editor that leaves the app, so a press that never
// touched the label must not reach it. jsdom measures nothing, so the press point is pinned through
// posAtCoords and the drawn label is addressed by the element the decoration puts it in.
const BODY = 'a [Home](https://x.test) b'

const press = (view: EditorView, pos: number, target: HTMLElement): void => {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
}

const label = (view: EditorView): HTMLElement =>
  view.dom.querySelector('.md-link') as HTMLElement

describe('an external link opens from its label and nowhere else', () => {
  it('a click on the label opens it', async () => {
    const view = await mountEditor({ initialBody: BODY })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    press(view, 5, label(view))
    expect(openExternal).toHaveBeenCalledWith('https://x.test')
  })

  // The `](url)` tail is replaced to zero width, so a coordinate in the empty space past the label
  // resolves back onto its last character. Following that would launch the system browser for a
  // link the pointer was never on.
  it('a click that clamps in from beside the label does not open it', async () => {
    const view = await mountEditor({ initialBody: BODY })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    press(view, 7, view.contentDOM)
    expect(openExternal).not.toHaveBeenCalled()
  })

  it('a link the caret was already inside when pressed does not open it', async () => {
    const view = await mountEditor({ initialBody: BODY })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 5 } })
    press(view, 5, label(view))
    expect(openExternal).not.toHaveBeenCalled()
  })
})
