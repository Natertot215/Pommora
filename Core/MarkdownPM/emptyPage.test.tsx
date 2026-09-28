// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '../Testing/editorHarness'
import { EMPTY_PAGE_TEXT } from './MarkdownEditor'

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

const shown = (): string | null =>
  editorContainer().querySelector('.cm-placeholder')?.textContent ?? null

describe('the empty page', () => {
  it('shows the empty-page text, keeps it with the caret inside, and drops it on the first character', async () => {
    const view: EditorView = await mountEditor({ initialBody: '' })
    expect(shown()).toBe(EMPTY_PAGE_TEXT)

    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 0 } })
    })
    expect(shown()).toBe(EMPTY_PAGE_TEXT)

    await act(async () => {
      view.dispatch({
        changes: { from: 0, insert: 'a' },
        selection: { anchor: 1 },
        userEvent: 'input.type',
      })
    })
    expect(shown()).toBeNull()
  })
})
