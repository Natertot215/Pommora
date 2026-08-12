// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
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

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}
const coords = { left: 10, right: 10, top: 10, bottom: 20 }

async function pickFirst(body: string, caret: number): Promise<{ doc: string; head: number }> {
  const view = await mountEditor({ initialBody: body, connections: conn })
  vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
  await act(async () => {
    view.focus()
    view.dispatch({ selection: { anchor: caret } })
  })
  expect(document.querySelector('.mdpm-ac')).toBeTruthy()
  await act(async () => {
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
  })
  return { doc: view.state.doc.toString(), head: view.state.selection.main.head }
}

describe('committing a connection leaves the caret off its closer', () => {
  // A caret on the closer keeps the token active, which would show the link just picked as raw
  // syntax. The space is what the caret steps over.
  it('inserts a trailing space and lands past it', async () => {
    const { doc, head } = await pickFirst('[[Alp]]', 4)
    expect(doc).toBe('[[Alpha]] ')
    expect(head).toBe(10)
  })

  it('steps over an existing space rather than adding a second', async () => {
    const { doc, head } = await pickFirst('[[Alp]] rest', 4)
    expect(doc).toBe('[[Alpha]] rest')
    expect(head).toBe(10)
  })
})
