// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { ok } from '@pommora/core/Contract/result'
import { stubDialer } from '../vitest.setup'
import { moveHeadingSection, registerPageEditor, renameHeading } from './pageEditor'

afterEach(() => registerPageEditor(null))

describe('renameHeading', () => {
  it('asks the cascade channel and rekeys folds, including a numbered duplicate suffix', async () => {
    const cascade = vi.fn(async () => ok({ touched: [] }))
    const foldsSet = vi.fn(async () => ok(null))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'connections:headingRenamed': cascade,
      'folds:get': async () => ok({ p1: ['Setup', 'Setup 2', 'Setup Notes', 'Other'] }),
      'folds:set': foldsSet,
    })

    await renameHeading('p1', 'Setup', 'Intro')

    expect(cascade).toHaveBeenCalledWith('p1', 'Setup', 'Intro')
    expect(foldsSet).toHaveBeenCalledWith('p1', ['Intro', 'Intro 2', 'Setup Notes', 'Other'])
  })

  it('does nothing to folds when the page has none', async () => {
    const foldsSet = vi.fn(async () => ok(null))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'connections:headingRenamed': async () => ok({ touched: [] }),
      'folds:get': async () => ok({}),
      'folds:set': foldsSet,
    })

    await renameHeading('p1', 'Setup', 'Intro')

    expect(foldsSet).not.toHaveBeenCalled()
  })

  it('leaves folds alone when nothing named the old heading', async () => {
    const foldsSet = vi.fn(async () => ok(null))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'connections:headingRenamed': async () => ok({ touched: [] }),
      'folds:get': async () => ok({ p1: ['Other'] }),
      'folds:set': foldsSet,
    })

    await renameHeading('p1', 'Setup', 'Intro')

    expect(foldsSet).not.toHaveBeenCalled()
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
