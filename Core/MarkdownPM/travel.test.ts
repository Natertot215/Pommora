// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { scrollGlide } from '@pommora/uix/Interactions/autoscroll'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'
import { nearestHeading, travelTo } from './travel'
import { foldedRegions, toggleFoldAt } from './folding'

stubEditorBridge()

vi.mock('@pommora/uix/Interactions/autoscroll', async (orig) => ({
  ...(await orig<typeof import('@pommora/uix/Interactions/autoscroll')>()),
  scrollGlide: vi.fn(),
}))

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

describe('travel scrolls whatever scrolls the page', () => {
  beforeEach(() => vi.mocked(scrollGlide).mockClear())
  afterEach(() => document.body.replaceChildren())

  // `.page-tile-grows` is a window body; the innermost element stands in for the tile the page draws in.
  const seat = (...classes: string[]): { body: HTMLElement; tile: HTMLElement } => {
    let host = document.body
    for (const cls of [...classes, 'page-tile']) {
      const el = document.createElement('div')
      el.className = cls
      host.append(el)
      host = el
    }
    return { body: document.body.firstElementChild as HTMLElement, tile: host }
  }

  it('a page grown inside a window body travels by scrolling the window body', async () => {
    const { body, tile } = seat('page-tile-grows')
    const view = await mountEditor({ initialBody: DOC }, tile)
    await act(async () => travelTo(view, DOC.indexOf('# Two')))
    expect(vi.mocked(scrollGlide).mock.calls.at(-1)?.[0]).toBe(body)
  })

  it('a page embedded in a window’s page still scrolls itself', async () => {
    const view = await mountEditor({ initialBody: DOC }, seat('page-tile-grows', 'page-tile').tile)
    await act(async () => travelTo(view, DOC.indexOf('# Two')))
    expect(vi.mocked(scrollGlide).mock.calls.at(-1)?.[0]).toBe(view.scrollDOM)
  })

  it('an editor outside any window still scrolls itself', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await act(async () => travelTo(view, DOC.indexOf('# Two')))
    expect(vi.mocked(scrollGlide).mock.calls.at(-1)?.[0]).toBe(view.scrollDOM)
  })

  it('a warm editor keeps its place where its page scrolls', async () => {
    const { body, tile } = seat('page-tile-grows')
    const capture = vi.fn()
    await mountEditor({ initialBody: DOC, warm: { restore: () => undefined, capture } }, tile)
    body.scrollTop = 300
    body.dispatchEvent(new Event('scroll'))
    await cleanupEditor()
    expect(capture).toHaveBeenCalledWith(expect.objectContaining({ scrollTop: 300 }))
  })
})

describe('nearestHeading picks the closer of two matches', () => {
  it('4 → 5', () => {
    const outline = [
      { from: 4, level: 1, text: 'Setup', key: 'Setup' },
      { from: 5, level: 1, text: 'Setup', key: 'Setup-2' },
    ]
    expect(nearestHeading(outline, 'Setup', 5)).toBe(5)
    expect(nearestHeading(outline, 'Setup', 4)).toBe(4)
  })
})
