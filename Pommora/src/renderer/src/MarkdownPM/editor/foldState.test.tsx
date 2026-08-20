// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'
import { applySavedFolds, foldedRegions, toggleFoldAt } from './folding'

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

const DOC = '# One\nbody one\nmore one\n\n# Two\nbody two'

const fold = async (view: EditorView, at: number): Promise<void> => {
  await act(async () => {
    toggleFoldAt(view, at)
  })
}

describe('the fold state machine', () => {
  it('a fold names its region, and reports it back', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, 0)
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual(['One'])
  })

  it('two sections fold independently, and each keeps its own key', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, 0)
    await fold(view, DOC.indexOf('# Two'))
    expect(
      foldedRegions(view.state)
        .map((r) => r.key)
        .sort(),
    ).toEqual(['One', 'Two'])
  })

  // An edit above a collapsed section moves it. The entry remaps with the document; anything the
  // reveal draws has to move with the entry, or the widget renders an empty box over hidden lines.
  it('an edit above a collapsed section keeps the section, and keeps what it draws', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, DOC.indexOf('# Two'))
    const before = foldedRegions(view.state)[0]
    await act(async () => {
      view.dispatch({ changes: { from: 0, to: 0, insert: 'preamble\n\n' } })
    })
    const after = foldedRegions(view.state)[0]
    expect(after?.key).toBe('Two')
    expect(after?.anchor).toBe(before.anchor + 'preamble\n\n'.length)
    expect(after?.hasBody).toBe(true)
  })

  // Without the prune, the body stays hidden behind a widget with no chevron anywhere to expand it —
  // invisible until the page is reloaded.
  it('deleting a folded heading drops its fold rather than hiding the body forever', async () => {
    const view = await mountEditor({ initialBody: DOC })
    const at = DOC.indexOf('# Two')
    await fold(view, at)
    await act(async () => {
      view.dispatch({ changes: { from: at, to: at + '# Two\n'.length, insert: '' } })
    })
    expect(foldedRegions(view.state)).toEqual([])
  })

  // A fold is identified by where it sits, so a deletion that lands another region of the same kind
  // on the same offset hands the fold over rather than dropping it. Recorded, not endorsed: a
  // stabler identity than an offset is its own decision.
  it('a region arriving at a folded one’s offset inherits the fold', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, 0)
    await act(async () => {
      view.dispatch({ changes: { from: 0, to: DOC.indexOf('# Two'), insert: '' } })
    })
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual(['Two'])
  })

  it('saved keys re-apply to the sections that carry them, and nothing else', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await act(async () => {
      applySavedFolds(view, ['Two', 'Nonexistent'])
    })
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual(['Two'])
  })

  it('toggling a folded section opens it', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, 0)
    await fold(view, 0)
    // Opening is animated, so the entry survives as 'expanding' until the transition lands — what
    // matters is that it stops counting as folded.
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual([])
  })

  it('a heading with no body under it has nothing to fold', async () => {
    const view = await mountEditor({ initialBody: '# One\n# Two\nbody' })
    await fold(view, 0)
    expect(foldedRegions(view.state)).toEqual([])
  })
})
