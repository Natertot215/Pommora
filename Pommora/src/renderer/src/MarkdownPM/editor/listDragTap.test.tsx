// @vitest-environment jsdom
// The glyph is one press with two meanings, and the shared gesture skeleton is what tells them
// apart: released in place it is a click (a checkbox toggles, a bullet seats the caret), carried
// past the activation threshold it is a drag and the click must not also fire. Geometry — where a
// drag actually lands — stays with the model suite and the CDP passes; jsdom measures every rect
// as zero.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'
import { firePointer, stubPointerCapture } from '@renderer/testing/pointerHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

stubPointerCapture()
stubEditorBridge()

beforeEach(() => {
  document.body.style.cursor = ''
})
afterEach(async () => {
  await cleanupEditor()
})

const glyphOf = (view: EditorView): HTMLElement => {
  const el = view.dom.querySelector('.md-li-glyph')
  if (!el) throw new Error('no list glyph rendered')
  return el as HTMLElement
}

/** Press the glyph, travel `dx` px, release. Under ACTIVATION that is a click; past it, a drag. */
async function pressGlyph(view: EditorView, dx: number): Promise<void> {
  await act(async () => {
    firePointer(glyphOf(view), 'pointerdown', { x: 0, y: 0 })
    firePointer(window, 'pointermove', { x: dx, y: 0 })
    firePointer(window, 'pointerup', { x: dx, y: 0 })
    await Promise.resolve()
  })
}

describe('a list glyph press is a click or a drag, never both', () => {
  it('released in place, a checkbox glyph toggles', async () => {
    const view = await mountEditor({ initialBody: '- [ ] task' })
    await pressGlyph(view, 2)
    expect(view.state.doc.toString()).toBe('- [x] task')
  })

  it('carried past the threshold, the same press leaves the checkbox alone', async () => {
    const view = await mountEditor({ initialBody: '- [ ] task' })
    await pressGlyph(view, 40)
    expect(view.state.doc.toString()).toBe('- [ ] task')
  })

  it('the grab cursor does not outlive the drag', async () => {
    const view = await mountEditor({ initialBody: '- [ ] task' })
    await pressGlyph(view, 40)
    expect(document.body.style.cursor).toBe('')
  })
})
