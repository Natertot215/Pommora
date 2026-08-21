// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { undo } from '@codemirror/commands'
import { EditorView } from '@codemirror/view'
import type { Personalization } from '@shared/types'
import { useSession } from '@renderer/store'
import { stubEditorBridge, mountEditor, cleanupEditor } from '@renderer/testing/editorHarness'
import { citationSeatAt, insertCitation } from './citationActions'
import { citationScan, splitWithOffsets } from '../detect'
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

// A file ending in a newline has an empty last line, and the caret sits there after any Enter and
// after a click in the blank area under the text. A citation seated at the last line holding content
// would land ABOVE the marker — the section standing before the thing that points at it.
describe('the first footnote is never written above its own marker', () => {
  const bodies = ['text\n', 'text\n\n', 'a\nb\n\n', '```\ncode\n```\n', 'text\n \n']
  for (const body of bodies) {
    it(`with the caret at the end of ${JSON.stringify(body)}`, async () => {
      const view = await mountEditor({ initialBody: body })
      await at(view, body.length)
      expect(await insert(view)).toBe(true)
      const out = doc(view)
      const scan = citationScan(splitWithOffsets(out), [])
      expect(scan.entries, out).toHaveLength(1)
      expect(scan.markers, out).toHaveLength(1)
      expect(scan.markers[0].ordinal, out).toBe(1)
      expect(out.indexOf('[^1]'), out).toBeLessThan(out.indexOf('[^1]:'))
      await cleanupEditor()
    })
  }

  it('and Paste As lands the same way', async () => {
    clipboard = 'pasted text'
    const view = await mountEditor({ initialBody: 'text\n\n' })
    await at(view, 6)
    await act(async () => {
      await pasteAs(view, 'footnote')
    })
    const out = doc(view)
    expect(citationScan(splitWithOffsets(out), []).entries, out).toHaveLength(1)
    expect(out.indexOf('[^1]'), out).toBeLessThan(out.indexOf('[^1]:'))
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

// Typing a label is a creation gesture like any other. It fires from the input handler and
// dispatches on its own — the transform chain beside it carries one range, and this writes two.
describe('typing a label seeds its citation', () => {
  const key = async (view: EditorView, ch: string): Promise<void> => {
    await act(async () => {
      const { from, to } = view.state.selection.main
      if (!view.dispatch || !type(view, from, to, ch))
        view.dispatch({
          changes: { from, to, insert: ch },
          selection: { anchor: from + ch.length },
        })
    })
  }
  // The input handler is what a keystroke reaches; jsdom cannot produce a real beforeinput, so the
  // handler is driven the way CodeMirror drives it.
  const type = (view: EditorView, from: number, to: number, ch: string): boolean =>
    view.state
      .facet(EditorView.inputHandler)
      .some((h) => h(view, from, to, ch, () => null as never))

  const write = async (view: EditorView, text: string): Promise<void> => {
    for (const ch of text) await key(view, ch)
  }

  beforeEach(() => settings({ jumpToCitation: false }))

  it('a fresh label writes its own empty citation', async () => {
    const view = await mountEditor({ initialBody: 'see' })
    await at(view, 3)
    await write(view, '[^a]')
    expect(doc(view)).toBe('see[^a]\n\n[^a]: ')
  })

  it('and takes the bracket the opener auto-paired rather than doubling it', async () => {
    const view = await mountEditor({ initialBody: 'see ' })
    await at(view, 4)
    await write(view, '[^a]')
    expect(doc(view)).toBe('see [^a]\n\n[^a]: ')
  })

  it('a label that already has a citation is adopted, and rewrites nothing', async () => {
    const body = 'one[^a] two'
    const view = await mountEditor({ initialBody: `${body}\n\n[^a]: shared` })
    await at(view, body.length)
    await write(view, '[^a]')
    expect(doc(view)).toBe('one[^a] two[^a]\n\n[^a]: shared')
  })

  it('an escaped marker seeds nothing and stays as written', async () => {
    const view = await mountEditor({ initialBody: 'see' })
    await at(view, 3)
    await write(view, '\\[^a]')
    expect(doc(view)).toBe('see\\[^a]')
  })

  it('a shape GFM will not read as a label seeds nothing', async () => {
    const view = await mountEditor({ initialBody: 'see' })
    await at(view, 3)
    await write(view, '[^my note]')
    expect(doc(view)).toBe('see[^my note]')
  })

  it('an ordinary bracket seeds nothing', async () => {
    const view = await mountEditor({ initialBody: 'see' })
    await at(view, 3)
    await write(view, '[label]')
    expect(doc(view)).toBe('see[label]')
  })

  it('a seed reverts whole on one undo', async () => {
    const view = await mountEditor({ initialBody: 'see' })
    await at(view, 3)
    await write(view, '[^a]')
    await act(async () => {
      undo(view)
    })
    expect(doc(view)).toBe('see[^a')
  })

  it('renumbers the section when the seed lands above an existing marker', async () => {
    const body = 'tail[^1]'
    const view = await mountEditor({ initialBody: `${body}\n\n[^1]: one` })
    await at(view, 0)
    await write(view, '[^b]')
    expect(doc(view)).toBe('[^b]tail[^2]\n\n[^b]: \n[^2]: one')
  })

  // A typed label is a creation like any other, so the setting governs it too — off, which every
  // other test here runs under, leaves the caret in the sentence being typed.
  it('with the jump on, the caret lands in the citation it just seeded', async () => {
    settings({})
    const view = await mountEditor({ initialBody: 'see' })
    await at(view, 3)
    await write(view, '[^a]')
    expect(doc(view)).toBe('see[^a]\n\n[^a]: ')
    expect(view.state.selection.main.from).toBe(doc(view).length)
    expect(hidden(view)).toBe(false)
  })

  it('seeds nothing inside the citations section', async () => {
    const body = 'x[^1]\n\n[^1]: one'
    const view = await mountEditor({ initialBody: body, citationsShown: true })
    await at(view, body.length)
    await write(view, '[^b]')
    expect(doc(view)).toBe('x[^1]\n\n[^1]: one[^b]')
  })
})
