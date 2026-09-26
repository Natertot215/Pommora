// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { EditorView } from '@codemirror/view'
import { ok } from '@pommora/core/Contract/result'
import type { ConnMenuAction } from '@pommora/core/Actions/connectionMenu'
import type { EditorMenuRequest } from '@pommora/core/Actions/editorMenu'
import { buildPageIndex } from '@pommora/core/Connections/pageIndex'
import { showConnectionMenu } from '../../Interface/Menus/connectionMenuActions'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { cleanupEditor, editorContainer, mountEditor, stubEditorBridge } from '../editorHarness'

if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const connMenu = vi.fn<(req: unknown) => Promise<ConnMenuAction | null>>()
stubEditorBridge({ menu: async (req: unknown) => ok(await connMenu(req)) })

const format = vi.fn<(req: EditorMenuRequest) => Promise<string | null>>()
let clipboard = ''
const host = () => ({ menus: { format }, clipboard: { read: async () => clipboard } })

beforeEach(() => {
  format.mockReset()
  format.mockResolvedValue(null)
  connMenu.mockReset()
  connMenu.mockResolvedValue(null)
  clipboard = ''
})
afterEach(cleanupEditor)

async function rightClick(view: EditorView, at: number, target?: Element): Promise<MouseEvent> {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(at)
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
  it('asks at the click, leaves the event to the browser, and applies the reply', async () => {
    format.mockResolvedValue('format:bold')
    const view = await mountEditor({ initialBody: 'bold', host: host() })
    view.dispatch({ selection: { anchor: 0, head: 4 } })
    const event = await rightClick(view, 2)
    expect(format).toHaveBeenCalledTimes(1)
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ scope: 'page', x: 12, y: 34 }))
    expect(event.defaultPrevented).toBe(false)
    expect(view.state.doc.toString()).toBe('**bold**')
  })

  it('reads the flags at the click when it lands outside the selection', async () => {
    const view = await mountEditor({ initialBody: 'plain **bold** plain', host: host() })
    view.dispatch({ selection: { anchor: 0 } })
    await rightClick(view, 9)
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ bold: true }))
  })

  it('never asks from a read-only editor', async () => {
    const view = await mountEditor({ initialBody: 'text', readOnly: true, host: host() })
    await rightClick(view, 1)
    expect(format).not.toHaveBeenCalled()
  })

  it('leaves a connection’s right-click to the connection menu', async () => {
    const conn: ConnectionsApi = {
      ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
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
    clipboard = '| a |\n| --- |'
    format.mockResolvedValue('paste:plain')
    const view = await mountEditor({ initialBody: '- item', host: host() })
    view.dispatch({ selection: { anchor: 6 } })
    await rightClick(view, 6)
    await act(async () => {})
    expect(view.state.doc.toString()).toBe('- item')

    await act(async () => {
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
    await act(async () => {})
    expect(view.state.doc.toString()).toBe('- item')
  })

  it('asks from a live cell with the cell’s scope and no page seats', async () => {
    await mountEditor({ initialBody: '| A | B |\n| --- | --- |\n| x | z |', host: host() })
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
    const cell = EditorView.findFromDOM(content as HTMLElement) as EditorView
    await rightClick(cell, 0)
    expect(format).toHaveBeenCalledTimes(1)
    expect(format).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'cell', embedSeat: false, citeSeat: false }),
    )
  })
})
