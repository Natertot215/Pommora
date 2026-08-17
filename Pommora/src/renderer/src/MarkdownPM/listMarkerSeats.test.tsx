// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

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
