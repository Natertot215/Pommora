// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '@renderer/testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))

// A tile is an object, not text. The press never reaches CM's own handlers (ignoreEvent takes the
// whole event out of the pipeline), so the relinquish rides the document-level listener.
describe('a press inside a tile', () => {
  it('costs the host its caret', async () => {
    const view = await mountEditor({
      initialBody: 'above\n\n![[Alpha]]\n\nbelow',
      connections: conn,
    })
    view.focus()
    expect(view.hasFocus).toBe(true)
    const tile = editorContainer().querySelector('.mdpm-embed-tile')
    tile?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await frame()
    expect(view.hasFocus).toBe(false)
  })

  it('leaves the host alone for a press outside a tile', async () => {
    const view = await mountEditor({
      initialBody: 'above\n\n![[Alpha]]\n\nbelow',
      connections: conn,
    })
    view.focus()
    view.contentDOM.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await frame()
    expect(view.hasFocus).toBe(true)
  })
})
