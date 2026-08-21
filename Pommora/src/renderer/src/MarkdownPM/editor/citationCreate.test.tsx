// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { undo } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import type { Personalization } from '@shared/types'
import { useSession } from '@renderer/store'
import { stubEditorBridge, mountEditor, cleanupEditor } from '@renderer/testing/editorHarness'
import { citationSeatAt, insertCitation } from './citationActions'
import { citationText } from './citationEdits'
import { foldedRegions } from './folding'
import { pasteAs } from './PasteLink'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

let clipboard = ''
const settings = (p: Partial<Personalization>): void => {
  useSession.setState({ personalization: p })
}

beforeEach(() => {
  clipboard = ''
  stubEditorBridge({ readClipboard: async () => clipboard })
  useSession.setState({ personalization: {} })
})
afterEach(async () => {
  await cleanupEditor()
})

const at = async (view: EditorView, pos: number): Promise<void> => {
  await act(async () => {
    view.dispatch({ selection: { anchor: pos } })
  })
}
const insert = async (view: EditorView): Promise<boolean> => {
  let out = false
  await act(async () => {
    out = insertCitation(view)
  })
  return out
}
const doc = (view: EditorView): string => view.state.doc.toString()
const hidden = (view: EditorView): boolean =>
  foldedRegions(view.state).some((r) => r.kind === 'citations')

describe('Insert ▸ Footnote writes a complete pair', () => {
  it('puts the marker at the caret and the citation at the document’s end', async () => {
    const view = await mountEditor({ initialBody: 'one two' })
    await at(view, 3)
    expect(await insert(view)).toBe(true)
    expect(doc(view)).toBe('one[^1] two\n\n[^1]: ')
  })

  it('joins a section that already exists rather than starting a second one', async () => {
    const body = 'a[^1] b\n\n[^1]: one'
    const view = await mountEditor({ initialBody: body })
    await at(view, body.indexOf(' b') + 2)
    await insert(view)
    expect(doc(view)).toBe('a[^1] b[^2]\n\n[^1]: one\n[^2]: ')
  })

  it('renumbers everything after it when it lands above an existing marker', async () => {
    const body = 'a b[^1]\n\n[^1]: one'
    const view = await mountEditor({ initialBody: body })
    await at(view, 1)
    await insert(view)
    expect(doc(view)).toBe('a[^1] b[^2]\n\n[^1]: \n[^2]: one')
  })

  it('seats the marker after a selection, so the words it annotates keep their text', async () => {
    const view = await mountEditor({ initialBody: 'one two' })
    await act(async () => {
      view.dispatch({ selection: { anchor: 0, head: 3 } })
    })
    await insert(view)
    expect(doc(view)).toBe('one[^1] two\n\n[^1]: ')
  })

  it('reverts whole on one undo, never half of it', async () => {
    const view = await mountEditor({ initialBody: 'one two' })
    await at(view, 3)
    await insert(view)
    await act(async () => {
      undo(view)
    })
    expect(doc(view)).toBe('one two')
  })
})

describe('Jump To Citation On Creation decides where the caret lands', () => {
  it('on, the section opens and the caret lands in the new citation', async () => {
    const view = await mountEditor({ initialBody: 'one two' })
    await at(view, 3)
    await insert(view)
    expect(doc(view).slice(view.state.selection.main.from)).toBe('')
    expect(doc(view).endsWith('[^1]: ')).toBe(true)
    expect(hidden(view)).toBe(false)
  })

  it('off, the pair is written silently and the caret stays on the marker', async () => {
    settings({ jumpToCitation: false })
    const view = await mountEditor({ initialBody: 'one two' })
    await at(view, 3)
    await insert(view)
    expect(view.state.selection.main.from).toBe(7)
    expect(doc(view).slice(0, 7)).toBe('one[^1]')
  })

  // The disclosure is the page's own visibility, so a section that was hidden stays hidden when the
  // setting says not to jump — and a section that did not exist a moment ago arrives hidden too,
  // which is the case the prior fold state has no answer for.
  it('off, the first footnote on a page arrives hidden', async () => {
    settings({ jumpToCitation: false })
    const view = await mountEditor({ initialBody: 'one two' })
    await at(view, 3)
    await insert(view)
    expect(doc(view)).toBe('one[^1] two\n\n[^1]: ')
    expect(hidden(view)).toBe(true)
  })

  it('off, a hidden section is left hidden', async () => {
    settings({ jumpToCitation: false })
    const view = await mountEditor({ initialBody: 'a[^1] b\n\n[^1]: one' })
    await at(view, 7)
    await insert(view)
    expect(hidden(view)).toBe(true)
  })
})

describe('a marker is refused where it could not bind', () => {
  it('inside the citations section', async () => {
    const body = 'a[^1] b\n\n[^1]: one'
    const view = await mountEditor({ initialBody: body, citationsShown: true })
    await at(view, body.length)
    expect(citationSeatAt(view.state)).toBe(false)
    expect(await insert(view)).toBe(false)
    expect(doc(view)).toBe(body)
  })

  it('inside a fenced code block', async () => {
    const body = 'intro\n\n```\ncode here\n```'
    const view = await mountEditor({ initialBody: body })
    await at(view, body.indexOf('code') + 2)
    expect(citationSeatAt(view.state)).toBe(false)
    expect(await insert(view)).toBe(false)
  })

  it('inside an inline code span', async () => {
    const body = 'text `span` more'
    const view = await mountEditor({ initialBody: body })
    await at(view, 8)
    expect(citationSeatAt(view.state)).toBe(false)
  })

  it('but ordinary prose is a seat', async () => {
    const view = await mountEditor({ initialBody: 'ordinary prose' })
    await at(view, 4)
    expect(citationSeatAt(view.state)).toBe(true)
  })
})

describe('Paste As ▸ Footnote', () => {
  it('shapes a multi-paragraph clipboard into one citation', async () => {
    clipboard = 'first para\n\nsecond para'
    const view = await mountEditor({ initialBody: 'body here' })
    await at(view, 4)
    await act(async () => {
      await pasteAs(view, 'footnote')
    })
    expect(doc(view)).toBe('body[^1] here\n\n[^1]: first para second para')
  })

  it('never leaves a line that could end the run', async () => {
    clipboard = 'lead in\n\n- a list item\n> and a quote'
    const view = await mountEditor({ initialBody: 'body' })
    await at(view, 4)
    await act(async () => {
      await pasteAs(view, 'footnote')
    })
    expect(doc(view)).toBe('body[^1]\n\n[^1]: lead in - a list item > and a quote')
  })

  it('collapses to one paragraph, whatever the whitespace was', () => {
    expect(citationText('  a\n\n\n  b\tc  ')).toBe('a b c')
    expect(citationText('   ')).toBe('')
  })
})
