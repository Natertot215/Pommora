// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import type { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const mount = (readOnly: boolean): Promise<EditorView> =>
  mountEditor({ initialBody: 'hello world', readOnly })

// A read-only portal must stay SELECTABLE: MarkdownPM renders selection natively (no drawSelection layer), so the content has to be a focusable contenteditable — editable stays true. Flipping editable to false makes .cm-content contenteditable="false", which native selection can't drive.
describe('read-only portal keeps its content selectable', () => {
  it('a read-only embed leaves .cm-content contenteditable', async () => {
    const view = await mount(true)
    expect(view.contentDOM.getAttribute('contenteditable')).toBe('true')
  })

  it('an editing embed is likewise contenteditable', async () => {
    const view = await mount(false)
    expect(view.contentDOM.getAttribute('contenteditable')).toBe('true')
  })
})

// EditorState.readOnly is ADVISORY — it doesn't block a programmatic view.dispatch({changes}), and with editable=true the DOM no longer blocks them either, so a changeFilter must drop doc changes while read-only or Cmd+B would edit + autosave a read-only surface.
describe('read-only portal blocks programmatic edits', () => {
  it('drops a doc-changing dispatch while read-only', async () => {
    const view = await mount(true)
    view.dispatch({ changes: { from: 0, insert: 'X' } })
    expect(view.state.doc.toString()).toBe('hello world')
  })

  it('allows the same dispatch once editing', async () => {
    const view = await mount(false)
    view.dispatch({ changes: { from: 0, insert: 'X' } })
    expect(view.state.doc.toString()).toBe('Xhello world')
  })
})
