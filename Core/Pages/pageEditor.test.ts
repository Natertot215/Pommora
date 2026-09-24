// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { ok } from '@pommora/core/Contract/result'
import { stubDialer } from '../vitest.setup'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { moveHeadingSection, registerPageEditor, renameHeading, usePageOutline } from './pageEditor'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => registerPageEditor(null))

describe('renameHeading', () => {
  it('asks the cascade channel', async () => {
    const cascade = vi.fn(async () => ok({ touched: [] }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'connections:headingRenamed': cascade,
    })

    await renameHeading('p1', 'Setup', 'Intro')

    expect(cascade).toHaveBeenCalledWith('p1', 'Setup', 'Intro')
  })
})

describe('moveHeadingSection', () => {
  const mount = (doc: string): EditorView => {
    const view = new EditorView({ doc })
    registerPageEditor(view)
    return view
  }

  it('a section dropped at the end lands above the footnotes', () => {
    const view = mount('# A\nbody[^1]\n\n# B\nmore\n\n[^1]: note')
    moveHeadingSection('A', null)
    expect(view.state.doc.toString()).toBe('# B\nmore\n\n# A\nbody[^1]\n\n[^1]: note')
  })

  it('a drag acts on the heading its key names, not the first with that prefix', () => {
    const view = mount('# Draft\na\n\n# Draft\nb\n\n# Draft 2\nc')
    moveHeadingSection('Draft 2', 'Draft')
    expect(view.state.doc.toString()).toBe('# Draft 2\nc\n\n# Draft\na\n\n# Draft\nb')
  })

  it('a before-key the document no longer holds moves nothing', () => {
    const doc = '# A\nbody\n\n# B\nmore'
    const view = mount(doc)
    moveHeadingSection('A', 'Gone')
    expect(view.state.doc.toString()).toBe(doc)
  })
})

describe('usePageOutline', () => {
  it('follows an editor that registers after the render that showed its page', async () => {
    let seen: string[] = []
    const Probe = (): null => {
      seen = usePageOutline().map((h) => h.text)
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
    expect(seen).toEqual([])
    act(() => registerPageEditor(new EditorView({ doc: '# A\nx\n# B\ny' })))
    expect(seen).toEqual(['A', 'B'])
    act(() => registerPageEditor(null))
    expect(seen).toEqual([])
    act(() => root.unmount())
  })
})
