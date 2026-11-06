// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { act } from 'react'
import { EditorView } from '@codemirror/view'
import { ok } from '../../Contract/result'
import type { LinkMenuAction } from '../../Actions/connectionMenu'
import type { EditorMenuRequest } from '../../Actions/editorMenu'
import type { GripMenuAction, GripMenuContext } from '../../Actions/gripMenu'
import { buildPageIndex } from '../../Connections/pageIndex'
import { showConnectionMenu } from '../../Interface/Menus/connectionMenuActions'
import type { ConnectionsApi } from '../Links/connectionsApi'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '../../Testing/editorHarness'

const connMenu = vi.fn<(req: unknown) => Promise<LinkMenuAction | null>>()
stubEditorBridge({ menu: async (req: unknown) => ok(await connMenu(req)) })

const format = vi.fn<(req: EditorMenuRequest) => Promise<string | null>>()
const grip = vi.fn<(ctx: GripMenuContext) => Promise<GripMenuAction | null>>()
let clipboard = ''
const host = () => ({ menus: { format, grip }, clipboard: { read: async () => clipboard } })

beforeEach(() => {
  format.mockReset()
  format.mockResolvedValue(null)
  grip.mockReset()
  grip.mockResolvedValue(null)
  connMenu.mockReset()
  connMenu.mockResolvedValue(null)
  clipboard = ''
})
afterEach(cleanupEditor)

// The pointer sits on the character after `at`, or on blank space past the one before it when `onText` is false.
async function rightClick(
  view: EditorView,
  at: number,
  target?: Element,
  onText = true,
): Promise<MouseEvent> {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(at)
  vi.spyOn(view, 'posAndSideAtCoords').mockReturnValue({ pos: at, assoc: onText ? 1 : -1 })
  vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 100 })
  const el = target ?? (view.dom.querySelector('.cm-line') as HTMLElement)
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    clientX: 12,
    clientY: 34,
  })
  await act(async () => {
    el.dispatchEvent(event)
    await Promise.resolve()
  })
  return event
}

describe('the editor’s native menu', () => {
  const TABLE = '| A | B |\n| --- | --- |\n| x | z |'

  it('asks at the click, leaves the event to the browser, and applies the reply', async () => {
    format.mockResolvedValue('format:bold')
    const view = await mountEditor({ initialBody: 'bold', host: host() })
    view.dispatch({ selection: { anchor: 0, head: 4 } })
    const event = await rightClick(view, 2)
    expect(format).toHaveBeenCalledTimes(1)
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ scope: 'page', menu: 'live' }))
    expect(event.defaultPrevented).toBe(false)
    expect(view.state.doc.toString()).toBe('**bold**')
  })

  it('reads the flags at the click when it lands outside the selection, and acts there', async () => {
    const view = await mountEditor({ initialBody: 'plain **bold** plain', host: host() })
    view.dispatch({ selection: { anchor: 0 } })
    await rightClick(view, 9)
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ bold: true }))
    await cleanupEditor()
    format.mockResolvedValue('format:bold')
    const edge = await mountEditor({ initialBody: 'one\ntwo two', host: host() })
    edge.dispatch({ selection: { anchor: 0, head: 4 } })
    await rightClick(edge, 4, edge.dom.querySelectorAll('.cm-line')[1])
    expect(edge.state.doc.toString()).toBe('one\n**two** two')
    let refused = false
    format.mockImplementation(async () => {
      const reseat = new Event('selectstart', { cancelable: true })
      document.dispatchEvent(reseat)
      refused = reseat.defaultPrevented
      return 'format:bold'
    })
    for (const [body, caret, at, onText, want] of [
      ["don't stop", 0, 2, true, "**don't** stop"],
      ["don't stop", 2, 2, true, "**don't** stop"],
      ["'quoted' it", 0, 1, true, "'**quoted**' it"],
      ['the end.', 0, 5, true, 'the **end**.'],
      ['ab\nnext', 7, 2, false, 'ab****\nnext'],
    ] as const) {
      await cleanupEditor()
      const word = await mountEditor({ initialBody: body, host: host() })
      word.dispatch({ selection: { anchor: caret } })
      await rightClick(word, at, undefined, onText)
      expect(word.state.doc.toString()).toBe(want)
      expect(refused).toBe(true)
    }
  })

  it('seats as a press does, so a row writes past a marker rather than into it', async () => {
    format.mockResolvedValue('format:bold')
    const view = await mountEditor({ initialBody: '1. one', host: host() })
    await rightClick(view, 2, undefined, false)
    expect(view.state.doc.toString()).toBe('1. ****one')
  })

  it('follows the seated word through an edit under the menu', async () => {
    let pick: (action: string) => void = () => {}
    format.mockReturnValue(new Promise((r) => (pick = r)))
    const view = await mountEditor({ initialBody: 'one two', host: host() })
    await rightClick(view, 5)
    view.dispatch({ changes: { from: 0, insert: 'x' } })
    await act(async () => pick('format:bold'))
    expect(view.state.doc.toString()).toBe('xone **two**')
  })

  it('reads the flags over the seat, so a mark’s outer edge checks it', async () => {
    const view = await mountEditor({ initialBody: '_it_ x', host: host() })
    await rightClick(view, 0)
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ italic: true }))
  })

  it('offers no footnote on a word ending an inline code span', async () => {
    const view = await mountEditor({ initialBody: 'a `abc` b', host: host() })
    await rightClick(view, 4)
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ citeSeat: false }))
  })

  it('reads the embed seat at the click, not at the caret', async () => {
    const view = await mountEditor({ initialBody: 'text\n\nmore', host: host() })
    view.dispatch({ selection: { anchor: 0 } })
    await rightClick(view, 5, view.dom.querySelectorAll('.cm-line')[1])
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ embedSeat: true }))
  })

  it('acts on the glyph’s group, whatever the selection touches', async () => {
    grip.mockResolvedValue('list:checkbox')
    const view = await mountEditor({ initialBody: '- a\n1. b\n2. c', host: host() })
    view.dispatch({ selection: { anchor: 0, head: 4 } })
    await rightClick(view, 4, view.dom.querySelectorAll('.md-list-glyph')[1])
    expect(view.state.doc.toString()).toBe('- a\n- [ ] b\n- [ ] c')
    await cleanupEditor()
    grip.mockResolvedValue('list:ordered')
    const drag = await mountEditor({ initialBody: '- a\n- b\n- c\n- d', host: host() })
    drag.dispatch({ selection: { anchor: 6, head: 11 } })
    await rightClick(drag, 4, drag.dom.querySelectorAll('.md-list-glyph')[1])
    expect(drag.state.doc.toString()).toBe('1. a\n2. b\n3. c\n4. d')
    let pick: (action: GripMenuAction) => void = () => {}
    grip.mockReturnValue(new Promise((r) => (pick = r)))
    await rightClick(drag, 0, drag.dom.querySelector('.md-list-glyph')!)
    drag.dispatch({ changes: { from: 0, insert: 'x' } })
    await act(async () => pick('list:checkbox'))
    expect(drag.state.doc.toString()).toBe('x1. a\n2. b\n3. c\n4. d')
  })

  it('asks the short menu from a read-only editor, with Copy over the seat and Select All', async () => {
    format.mockResolvedValue('edit:copy')
    const write = vi.fn(async () => {})
    const view = await mountEditor({
      initialBody: 'one two',
      readOnly: true,
      host: { ...host(), clipboard: { write } },
    })
    await rightClick(view, 5)
    expect(format).toHaveBeenCalledWith(
      expect.objectContaining({ menu: 'short', selection: 'two' }),
    )
    expect(write).toHaveBeenCalledWith('two')
    format.mockResolvedValue('edit:selectAll')
    await rightClick(view, 1)
    expect(view.state.selection.main).toMatchObject({ from: 0, to: 7 })
  })

  it('keeps a right-click from the layers above, whose cancelling would strand the ask', async () => {
    const above = vi.fn()
    document.addEventListener('contextmenu', above)
    onTestFinished(() => document.removeEventListener('contextmenu', above))
    const view = await mountEditor({ initialBody: 'text', readOnly: true, host: host() })
    await rightClick(view, 1)
    expect(above).not.toHaveBeenCalled()
  })

  it('reads a glyph on a read-only editor as text', async () => {
    const view = await mountEditor({ initialBody: '- a', readOnly: true, host: host() })
    await rightClick(view, 2, view.dom.querySelector('.md-list-glyph')!)
    expect(grip).not.toHaveBeenCalled()
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ menu: 'short' }))
  })

  it('selects and focuses the page from a read-only table’s Select All, so ⌘C reads it', async () => {
    format.mockResolvedValue('edit:selectAll')
    const doc = document as { caretPositionFromPoint?: unknown }
    doc.caretPositionFromPoint = () => null
    onTestFinished(() => {
      delete doc.caretPositionFromPoint
    })
    const page = await mountEditor({ initialBody: `x\n\n${TABLE}`, readOnly: true, host: host() })
    let cell: Element | null = null
    for (let i = 0; !cell && i < 50; i++) {
      await act(() => new Promise((r) => setTimeout(r, 20)))
      cell = editorContainer().querySelector('tbody .mdpm-tbl-cell-static')
    }
    await act(async () => {
      cell?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
    expect(page.state.selection.main).toMatchObject({ from: 0, to: page.state.doc.length })
    expect(document.activeElement).toBe(page.contentDOM)
  })

  it('leaves a connection’s right-click to the connection menu', async () => {
    const conn: ConnectionsApi = {
      index: buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
      headingsOf: () => undefined,
      open: () => {},
      menu: showConnectionMenu,
    }
    const view = await mountEditor({
      initialBody: 'a [[Alpha]] b',
      connections: conn,
      host: host(),
    })
    view.dispatch({ selection: { anchor: 0 } })
    await rightClick(view, 6, view.dom.querySelector('.md-connection-resolved') as HTMLElement)
    expect(connMenu).toHaveBeenCalled()
    expect(format).not.toHaveBeenCalled()
  })

  it('pastes plain text as a tagged paste, so a table payload is refused on a list line', async () => {
    format.mockResolvedValue('paste:literal')
    const view = await mountEditor({ initialBody: '- item', host: host() })
    const menu = () => rightClick(view, 6, undefined, false)
    const chord = () =>
      act(async () => {
        view.contentDOM.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'v',
            metaKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true,
          }),
        )
      })
    const paste = async (via: () => Promise<unknown>, text: string): Promise<string> => {
      clipboard = text
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: '- item' },
        selection: { anchor: 6 },
      })
      await via()
      await act(async () => {})
      return view.state.doc.toString()
    }
    for (const via of [menu, chord]) {
      expect(await paste(via, '| a |\n| --- |')).toBe('- item')
      expect(await paste(via, 'x')).toBe('- itemx')
    }
  })

  async function liveCell(body: string): Promise<{ page: EditorView; cell: EditorView }> {
    const page = await mountEditor({ initialBody: body, host: host() })
    let table: Element | null = null
    for (let i = 0; !table && i < 50; i++) {
      await act(() => new Promise((r) => setTimeout(r, 20)))
      table = editorContainer().querySelector('table.mdpm-tbl')
    }
    const div = table?.querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
    const ev = { bubbles: true, cancelable: true, button: 0, clientX: 4, clientY: 4 }
    await act(async () => {
      div.dispatchEvent(new MouseEvent('pointerdown', ev))
      div.dispatchEvent(new MouseEvent('mousedown', ev))
      div.dispatchEvent(new MouseEvent('click', { ...ev, detail: 1 }))
    })
    const content = editorContainer().querySelector('.mdpm-tbl-cell-editor .cm-content')
    return { page, cell: EditorView.findFromDOM(content as HTMLElement) as EditorView }
  }

  it('asks from a live cell with the cell’s scope and no page seats, and answers in the cell', async () => {
    format.mockResolvedValue('format:bold')
    const { page, cell } = await liveCell(`before\n\n${TABLE}`)
    cell.dispatch({ selection: { anchor: 0, head: 1 } })
    await rightClick(cell, 0)
    expect(format).toHaveBeenCalledTimes(1)
    expect(format).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'lists', embedSeat: false, citeSeat: false }),
    )
    await act(async () => {})
    expect(page.state.doc.toString()).toBe(`before\n\n| A | B |\n| --- | --- |\n| **x** | z |`)
  })

  it('fills the cells with a table-shaped clipboard pasted plain into a cell', async () => {
    clipboard = '| a | b |\n| c | d |'
    format.mockResolvedValue('paste:literal')
    const { page, cell } = await liveCell(TABLE)
    await rightClick(cell, 0)
    await act(async () => {})
    await act(async () => {})
    expect(page.state.doc.toString()).toBe('| A | B |\n| --- | --- |\n| a | b |\n| c | d |')
  })
})
