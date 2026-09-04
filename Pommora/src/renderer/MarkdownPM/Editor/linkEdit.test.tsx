// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ConnMenuAction } from '@shared/connMenu'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { showConnectionMenu } from '@renderer/Actions/connectionMenu'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/Testing/editorHarness'
import { useSession } from '@renderer/store'
import { commitAliasOnEnter } from './linkEdit'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const connMenu = vi.fn<(ctx: { editable: boolean }) => Promise<ConnMenuAction | null>>()
stubEditorBridge({ connMenu })

beforeEach(() => {
  connMenu.mockReset()
  connMenu.mockResolvedValue(null)
})
afterEach(async () => {
  await cleanupEditor()
})

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
  menu: showConnectionMenu,
}

/** Right-click the rendered link and let the menu's promise settle. */
async function rightClick(view: EditorView, pos: number): Promise<void> {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
  await act(async () => {
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await Promise.resolve()
  })
}

describe('the connection menu knows its span and its surface', () => {
  it('offers the authoring pair on an editable surface', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await rightClick(view, 6)
    expect(connMenu).toHaveBeenCalledWith({
      surface: 'editor',
      editable: true,
      hasAlias: false,
      open: 'closed',
      windowed: false,
    })
  })

  // The item names the act: on a bare link there is no title yet to rename.
  it('reports an existing alias, so the item can name renaming instead of adding', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await rightClick(view, 12)
    expect(connMenu).toHaveBeenCalledWith({
      surface: 'editor',
      editable: true,
      hasAlias: true,
      open: 'closed',
      windowed: false,
    })
  })

  it('an opened-but-empty alias still reports none — there is nothing to rename', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
    await rightClick(view, 6)
    expect(connMenu).toHaveBeenCalledWith({
      surface: 'editor',
      editable: true,
      hasAlias: false,
      open: 'closed',
      windowed: false,
    })
  })

  // The native editor menu carries spelling, autocorrect, and substitutions. Inside a link's
  // syntax you're editing prose, so that menu wins over the two link actions.
  it('stands down inside the syntax, leaving the native menu', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 6 } })
    })
    await rightClick(view, 6)
    expect(connMenu).not.toHaveBeenCalled()
  })

  // PageWindow starts read-only and silently drops doc changes, so Rename there would seat a
  // caret and swallow every keystroke.
  it('withholds it from a read-only surface', async () => {
    const view = await mountEditor({
      initialBody: 'a [[Alpha]] b',
      connections: conn,
      readOnly: true,
    })
    await rightClick(view, 6)
    expect(connMenu).toHaveBeenCalledWith({
      surface: 'editor',
      editable: false,
      hasAlias: false,
      open: 'closed',
      windowed: false,
    })
  })
})

describe('an alias opened and abandoned leaves nothing behind', () => {
  it('Add Title reuses a pipe that is already there rather than stacking a second', async () => {
    connMenu.mockResolvedValue('rename')
    const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
    await rightClick(view, 6)
    expect(view.state.doc.toString()).toBe('a [[Alpha|]] b')
    expect(view.state.selection.main.head).toBe(10)
  })

  it('leaving an empty alias collapses its pipe', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 10 } })
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: 0 } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('a [[Alpha]] b')
  })

  // Clicking another page blurs and unmounts this editor in the same task, so a collapse deferred
  // to a macrotask would fire against a destroyed view and do nothing.
  it('collapses on blur without waiting for a timer', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 10 } })
    })
    view.contentDOM.dispatchEvent(new FocusEvent('blur'))
    expect(view.state.doc.toString()).toBe('a [[Alpha]] b')
  })

  it('a written alias is left alone', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 12 } })
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: 0 } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('a [[Alpha|the one]] b')
  })
})

// Enter finishes an alias by moving the caret to the closer and nothing else. The closer is the one
// position that leaves a connection rendered, so no space is written to put distance between them.
describe('Enter finishes an alias without writing anything', () => {
  it('rests the caret on the closer and leaves the text alone', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 13 } })
    })
    await act(async () => {
      commitAliasOnEnter(view)
    })
    expect(view.state.doc.toString()).toBe('a [[Alpha|the one]] b')
    expect(view.state.selection.main.head).toBe(19)
  })

  it('declines outside an alias, so Enter still breaks the line', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 6 } })
    })
    expect(commitAliasOnEnter(view)).toBe(false)
  })
})

// The two open items are the shared page menu's, so a link reaches its page exactly as every other
// surface pointing at one does.
describe('a connection opens its page the two ways every page menu offers', () => {
  it('Open New Tab selects the page a link names into a tab of its own', async () => {
    const select = vi.fn(async () => {})
    useSession.setState({ select })
    connMenu.mockResolvedValue('title:newtab')
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await rightClick(view, 6)
    expect(select).toHaveBeenCalledWith(
      { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' },
      { newTab: true },
    )
  })

  it('Open Preview floats it instead', async () => {
    const openWindow = vi.fn()
    useSession.setState({ openWindow })
    connMenu.mockResolvedValue('title:window')
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await rightClick(view, 6)
    expect(openWindow).toHaveBeenCalledWith({ id: 'p1', path: 'Notes/Alpha.md' })
  })
})

describe('Rename and Edit Link land the caret where their names imply', () => {
  it('Rename opens an alias on a link that has none', async () => {
    connMenu.mockResolvedValue('rename')
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await rightClick(view, 6)
    expect(view.state.doc.toString()).toBe('a [[Alpha|]] b')
    expect(view.state.selection.main.head).toBe(10)
  })

  it('Rename selects an existing alias so typing replaces it', async () => {
    connMenu.mockResolvedValue('rename')
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await rightClick(view, 12)
    const sel = view.state.selection.main
    expect(view.state.doc.sliceString(sel.from, sel.to)).toBe('the one')
  })

  it('Edit Link lands at the title’s end, ahead of the alias', async () => {
    connMenu.mockResolvedValue('editLink')
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await rightClick(view, 12)
    expect(view.state.selection.main.head).toBe(9)
    expect(view.state.doc.toString()).toBe('a [[Alpha|the one]] b')
  })
})
