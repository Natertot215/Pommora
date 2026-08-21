// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'
import { travelTo } from './travel'
import { foldedRegions, toggleFoldAt } from './folding'

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

const DOC = '# One\nbody one\n\n# Two\nbody two'

describe('travel goes somewhere without editing or moving the caret', () => {
  it('leaves the document and the selection exactly as they were', async () => {
    const view = await mountEditor({ initialBody: DOC })
    const before = view.state.selection.main.head
    await act(async () => {
      travelTo(view, DOC.indexOf('# Two'))
    })
    expect(view.state.doc.toString()).toBe(DOC)
    expect(view.state.selection.main.head).toBe(before)
  })

  it('an offset past the end is clamped rather than throwing', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await act(async () => {
      travelTo(view, DOC.length + 5000)
    })
    expect(view.state.doc.toString()).toBe(DOC)
  })

  // Arriving at a heading whose body is still folded is indistinguishable from having gone nowhere,
  // so a travel opens what conceals its destination before it measures anything.
  it('opens a fold hiding the destination', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await act(async () => {
      toggleFoldAt(view, 0)
    })
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual(['One'])
    await act(async () => {
      travelTo(view, DOC.indexOf('body one'))
    })
    expect(foldedRegions(view.state)).toEqual([])
  })

  it('and leaves a fold that hides nothing on the way alone', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await act(async () => {
      toggleFoldAt(view, 0)
    })
    await act(async () => {
      travelTo(view, DOC.indexOf('body two'))
    })
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual(['One'])
  })
})
