// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import type { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const mount = (readOnly: boolean): Promise<EditorView> =>
  mountEditor({ initialBody: 'hello world', readOnly })

// A read-only portal stays SELECTABLE unless it opts out: its .cm-content stays a focusable contenteditable, editable true. Opting out makes it contenteditable="false".
describe('read-only portal keeps its content selectable', () => {
  it('a read-only embed leaves .cm-content contenteditable', async () => {
    const view = await mount(true)
    expect(view.contentDOM.getAttribute('contenteditable')).toBe('true')
  })
})

describe('an unselectable editor keeps its content out of reach', () => {
  it("leaves .cm-content out of the keyboard's reach", async () => {
    const view = await mountEditor({
      initialBody: 'hello world',
      readOnly: true,
      selectable: false,
    })
    expect(view.contentDOM.getAttribute('contenteditable')).toBe('false')
  })

  it('claims a press on it, so a double press moves no focus', async () => {
    const view = await mountEditor({
      initialBody: 'hello world',
      readOnly: true,
      selectable: false,
    })
    const held = document.body.appendChild(document.createElement('button'))
    held.focus()
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2 })
    view.contentDOM.dispatchEvent(press)
    expect(document.activeElement).toBe(held)
    held.remove()
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
