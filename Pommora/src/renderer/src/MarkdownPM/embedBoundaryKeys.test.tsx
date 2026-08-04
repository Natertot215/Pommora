// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

const mount = (initialBody: string): Promise<EditorView> =>
  mountEditor({ initialBody, connections: conn })

const key = (view: EditorView, k: string): void => {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
  )
}

// The boundary-delete refusals, driven through the real keymap: without the input-guard branches,
// CM's default delete expands over the atomic range and removes the whole tile from one keystroke.
describe('embed boundary keys', () => {
  it('Backspace at the line below a tile is refused', async () => {
    const doc = 'alpha\n![[Alpha]]\nbeta'
    const view = await mount(doc)
    view.dispatch({ selection: EditorSelection.cursor(17) })
    key(view, 'Backspace')
    expect(view.state.doc.toString()).toBe(doc)
  })

  it('Delete at the end of the line above a tile is refused', async () => {
    const doc = 'alpha\n![[Alpha]]\nbeta'
    const view = await mount(doc)
    view.dispatch({ selection: EditorSelection.cursor(5) })
    key(view, 'Delete')
    expect(view.state.doc.toString()).toBe(doc)
  })

  it('a spanning selection delete removes the tile as its absorbed unit', async () => {
    // The atomic absorb makes tile + boundary newlines one delete unit, so the neighbors join —
    // with the fencing blanks a real tile carries, the surviving blank keeps the lines apart.
    const view = await mount('alpha\n![[Alpha]]\nbeta')
    view.dispatch({ selection: EditorSelection.range(6, 17) })
    key(view, 'Backspace')
    expect(view.state.doc.toString()).toBe('alphabeta')
  })

  it('a fenced tile deletes to its clean fenced shape', async () => {
    const view = await mount('alpha\n\n![[Alpha]]\n\nbeta')
    view.dispatch({ selection: EditorSelection.range(7, 18) })
    key(view, 'Backspace')
    expect(view.state.doc.toString()).toBe('alpha\n\nbeta')
  })
})
