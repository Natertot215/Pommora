// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'

stubEditorBridge()

afterEach(async () => {
  await cleanupEditor()
})

describe('the visible drawing', () => {
  it('marks each two-way arrow where it sits within the visible range', async () => {
    const view = await mountEditor({ initialBody: 'a ↔ b\n↔' })
    Object.defineProperty(view, 'visibleRanges', { get: () => [{ from: 4, to: 7 }] })
    await act(async () => {
      view.dispatch({ selection: { anchor: 1 } })
    })
    const arrows = [...view.contentDOM.querySelectorAll('.dual-direction-arrow')]
    expect(arrows.map((el) => view.posAtDOM(el))).toEqual([6])
  })
})
