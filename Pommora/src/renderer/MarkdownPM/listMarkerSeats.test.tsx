// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '@renderer/Testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const mount = (initialBody: string): Promise<EditorView> => mountEditor({ initialBody })

/** Where a cursor motion actually lands — the same path the arrow keys take, so this exercises the
 *  atomic ranges rather than asserting they exist. */
const stepLeft = (view: EditorView, from: number): number =>
  view.moveByChar(EditorSelection.cursor(from), false).head

const stepRight = (view: EditorView, from: number): number =>
  view.moveByChar(EditorSelection.cursor(from), true).head

// A hidden marker slot has interior positions with nothing on screen to stand for them. The caret
// reaching one renders at the widget's edge instead of where it sits, and a selection anchored there
// takes marker characters the reader can't see.
describe('a list marker holds no seats the reader cannot see', () => {
  it('steps from the start of text past the whole `- ` slot, never into it', async () => {
    // `- foo`: the dash is 0, its space 1, the text starts at 2.
    const view = await mount('- foo')
    expect(stepLeft(view, 2)).toBe(0)
  })

  it('steps back out over the slot in one move', async () => {
    const view = await mount('- foo')
    expect(stepRight(view, 0)).toBe(2)
  })

  it('holds for a checkbox, whose slot is wider', async () => {
    // `- [ ] foo`: the text starts at 6.
    const view = await mount('- [ ] foo')
    expect(stepLeft(view, 6)).toBe(0)
  })

  it('leaves an ordered marker alone — its number is real text, and typing follows it', async () => {
    // `1. foo`: the number is visible source, so every seat in it is one the reader can see.
    const view = await mount('1. foo')
    expect(stepLeft(view, 3)).toBe(2)
    expect(stepLeft(view, 2)).toBe(1)
  })

  it('lets the caret into the marker once the line reveals its raw source', async () => {
    const view = await mount('- foo')
    // The reveal is the caret's own AND only while the editor holds focus — an unfocused editor
    // shows every marker as its glyph, so the slot stays whole.
    view.focus()
    view.dispatch({ selection: EditorSelection.cursor(0) })
    expect(stepRight(view, 0)).toBe(1)
  })

  it('keeps the slot whole while the editor is unfocused, where nothing reveals', async () => {
    const view = await mount('- foo')
    view.dispatch({ selection: EditorSelection.cursor(0) })
    expect(stepRight(view, 0)).toBe(2)
  })
})

// A footnote marker is a widget over source the reader never sees, so the same rule holds: no seat
// inside it. The unbound marker is the other half of the control — nothing draws over it, so every
// one of its positions is real.
describe('a footnote marker holds no seats the reader cannot see', () => {
  const BOUND = 'a [^1] b\n\n[^1]: one'
  const UNBOUND = 'a [^9] b\n\n[^1]: one'
  // `a [^1] b`: the marker runs 2..6.

  it('steps across the whole marker in one move, from either side', async () => {
    const view = await mount(BOUND)
    expect(stepLeft(view, 6)).toBe(2)
    expect(stepRight(view, 2)).toBe(6)
  })

  it('lets the caret inside an unmatched marker, which draws nothing', async () => {
    const view = await mount(UNBOUND)
    expect(stepLeft(view, 6)).toBe(5)
    expect(stepRight(view, 2)).toBe(3)
  })

  it('holds the slot whole even with the caret sitting on it', async () => {
    const view = await mount(BOUND)
    view.focus()
    view.dispatch({ selection: EditorSelection.cursor(6) })
    expect(stepLeft(view, 6)).toBe(2)
  })

  it('draws the positional number, not the label beneath it', async () => {
    const view = await mount('x[^7] y[^1]\n\n[^1]: one\n[^7]: seven')
    const glyphs = [...editorContainer().querySelectorAll('.md-cite-ref')].map(
      (el) => el.textContent,
    )
    expect(glyphs).toEqual(['1', '2'])
    expect(view.state.doc.toString()).toContain('[^7]')
  })

  it('draws nothing in a fence, in inline code, or on citation syntax that is prose', async () => {
    // The mid-document `[^1]:` line is live prose per the model, and the trailing run's own text
    // holds a `[^1]` that stays literal — markers draw in the body and in cells, never in a row.
    await mount('```\n[^1]\n```\n\n`[^1]`\n\n[^1]: mid-doc\n\nprose\n\n[^1]: text [^1]')
    expect(editorContainer().querySelectorAll('.md-cite-ref')).toHaveLength(0)
  })
})
