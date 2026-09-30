// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { EditorView } from '@codemirror/view'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'
import { embedTiles } from './embedWidget'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '../../Testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))

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

  it('leaves an editor nested in the tile its own caret', async () => {
    await mountEditor({ initialBody: 'above\n\n![[Alpha]]\n\nbelow', connections: conn })
    const tile = editorContainer().querySelector('.mdpm-embed-tile') as HTMLElement
    const nested = new EditorView({
      doc: 'inner',
      parent: tile,
      extensions: embedTiles({ getConn: () => undefined, ancestors: ['Notes/Alpha.md'] }),
    })
    nested.focus()
    nested.contentDOM.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await frame()
    expect(nested.hasFocus).toBe(true)
    nested.destroy()
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
