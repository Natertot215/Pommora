// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '../../Testing/editorHarness'
import { healTileScrolls, registerScrollHeal } from './scrollHeal'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  index: buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  headingsOf: () => undefined,
  open: () => {},
}

const mount = (initialBody: string): Promise<EditorView> =>
  mountEditor({ initialBody, connections: conn })

const key = (view: EditorView, k: string): void => {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
  )
}

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

describe('the tile scroll heal', () => {
  const frame = (): Promise<void> =>
    act(() => new Promise<void>((r) => requestAnimationFrame(() => r())))

  it('a caret move asks for no heal, and an edit does', async () => {
    const view = await mount('alpha\n![[Alpha]]\nbeta')
    await frame()
    const heard = vi.fn()
    const unregister = registerScrollHeal(heard)
    view.dispatch({ selection: EditorSelection.cursor(2) })
    await frame()
    expect(heard).not.toHaveBeenCalled()
    view.dispatch({ changes: { from: 0, insert: 'x' } })
    await frame()
    expect(heard).toHaveBeenCalledWith(view.dom)
    unregister()
  })

  it('restores only an editor inside the one that re-slotted', async () => {
    const view = await mountEditor({
      initialBody: 'alpha',
      warm: { restore: () => ({ scrollTop: 200 }), capture: () => {} },
    })
    await frame()
    view.scrollDOM.scrollTop = 0
    healTileScrolls(view.dom)
    healTileScrolls(document.createElement('div'))
    expect(view.scrollDOM.scrollTop).toBe(0)
    healTileScrolls(editorContainer())
    expect(view.scrollDOM.scrollTop).toBe(200)
  })
})
