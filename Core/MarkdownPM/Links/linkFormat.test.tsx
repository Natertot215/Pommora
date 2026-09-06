// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { type ConnMenuAction, connMenuModel } from '@pommora/core/Actions/connMenu'
import { EDITOR_ACTION_PREFIX, INSERT_LINK_ACTION } from '@pommora/core/Actions/editorMenu'
import { linkMarkdown } from '@pommora/core/Web/pasteLink'
import { buildPageIndex, type ConnectionsApi } from './connectionsApi'
import { showConnectionMenu } from '../../Interface/Menus/connectionMenu'
import { applyEditorAction, claimEditorMenu } from '../Menus/menu'
import {
  cleanupEditor,
  mountEditor,
  seedHost,
  settleTitle,
  stubEditorBridge,
} from '../editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const connMenu = vi.fn<(req: unknown) => Promise<ConnMenuAction | null>>()
const writeClipboard = vi.fn()
stubEditorBridge({ 'row-menu': connMenu, 'clipboard:write': writeClipboard })

const URL = 'https://www.example.com/a/b'
const BODY = `a [Home](${URL}) b`

const conn: ConnectionsApi = {
  ...buildPageIndex([]),
  open: () => {},
  menu: showConnectionMenu,
}

beforeEach(() => {
  connMenu.mockReset()
  connMenu.mockResolvedValue(null)
  writeClipboard.mockReset()
  seedHost({})
})
afterEach(async () => {
  await cleanupEditor()
})

const rightClick = async (view: EditorView): Promise<void> => {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(5)
  const el = view.dom.querySelector('.md-link') as HTMLElement
  await act(async () => {
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    await Promise.resolve()
  })
}

const choose = async (action: ConnMenuAction, body = BODY): Promise<EditorView> => {
  connMenu.mockResolvedValue(action)
  const view = await mountEditor({ initialBody: body, connections: conn })
  await rightClick(view)
  return view
}

describe('the menu a link pointing at an address carries', () => {
  it('offers the editing items on a surface that can take them', async () => {
    const view = await mountEditor({ initialBody: BODY, connections: conn })
    await rightClick(view)
    expect(connMenu).toHaveBeenCalledWith({
      items: connMenuModel({
        surface: 'editor',
        editable: true,
        hasAlias: false,
        external: true,
      }),
      anchor: undefined,
    })
  })

  it('offers none of them on a read-only surface', async () => {
    const view = await mountEditor({ initialBody: BODY, connections: conn, readOnly: true })
    await rightClick(view)
    expect(connMenu).toHaveBeenCalledWith({
      items: connMenuModel({
        surface: 'editor',
        editable: false,
        hasAlias: false,
        external: true,
      }),
      anchor: undefined,
    })
  })

  it('still copies the address', async () => {
    await choose('title:copylink')
    expect(writeClipboard).toHaveBeenCalledWith(URL)
  })
})

describe('Format rewrites the label and nothing else', () => {
  it('writes the whole address in Full Link form', async () => {
    const view = await choose('format:link-full')
    expect(view.state.doc.toString()).toBe(`a [${URL}](${URL}) b`)
  })

  it('writes the bare domain in Short Link form', async () => {
    const view = await choose('format:link-short')
    expect(view.state.doc.toString()).toBe(`a [example.com](${URL}) b`)
  })

  it('takes a title already cached', async () => {
    seedHost({ linkTitles: { [URL]: 'Example Domain' } })
    const view = await choose('format:link-title')
    expect(view.state.doc.toString()).toBe(`a [Example Domain](${URL}) b`)
  })

  it('stands the domain in until the title lands', async () => {
    const view = await choose('format:link-title')
    expect(view.state.doc.toString()).toBe(`a [example.com](${URL}) b`)
    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(`a [Example Domain](${URL}) b`)
  })

  it('agrees with what a paste in the same mode would have written', async () => {
    const view = await choose('format:link-short')
    expect(view.state.doc.toString()).toBe(`a ${linkMarkdown(URL, 'link-short')} b`)
  })
})

describe('the three that act on the link itself', () => {
  it('Rename selects the label', async () => {
    const view = await choose('rename')
    const sel = view.state.selection.main
    expect(view.state.sliceDoc(sel.from, sel.to)).toBe('Home')
  })

  it('Edit Link selects the address', async () => {
    const view = await choose('editLink')
    const sel = view.state.selection.main
    expect(view.state.sliceDoc(sel.from, sel.to)).toBe(URL)
  })

  it('Remove Link leaves the label as prose', async () => {
    const view = await choose('link:remove')
    expect(view.state.doc.toString()).toBe('a Home b')
  })

  it('Remove Link unescapes what the syntax made the label carry', async () => {
    const view = await choose('link:remove', `a [Notes \\[WIP\\]](${URL}) b`)
    expect(view.state.doc.toString()).toBe('a Notes [WIP] b')
  })

  it('Delete takes the whole link', async () => {
    const view = await choose('link:delete')
    expect(view.state.doc.toString()).toBe('a  b')
  })

  it('declines when the document shrank past the span while the menu was open', async () => {
    connMenu.mockResolvedValue('link:delete')
    const view = await mountEditor({ initialBody: BODY, connections: conn })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(5)
    const el = view.dom.querySelector('.md-link') as HTMLElement
    await act(async () => {
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'x' } })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(view.state.doc.toString()).toBe('x')
  })
})

describe('Insert Link over a selected address', () => {
  const insert = async (body: string, from: number, to: number): Promise<EditorView> => {
    const view = await mountEditor({ initialBody: body })
    claimEditorMenu(view)
    view.dispatch({ selection: { anchor: from, head: to } })
    await act(async () => {
      applyEditorAction(view, EDITOR_ACTION_PREFIX + INSERT_LINK_ACTION)
    })
    return view
  }

  it('points the address at itself, leaving it readable as what it was', async () => {
    const view = await insert(`see ${URL} now`, 4, 4 + URL.length)
    expect(view.state.doc.toString()).toBe(`see [${URL}](${URL}) now`)
  })

  it('gives a schemeless address the scheme it needs to open', async () => {
    const view = await insert('see example.com now', 4, 15)
    expect(view.state.doc.toString()).toBe('see [example.com](https://example.com) now')
  })

  it('declines on a selection no address could be read from', async () => {
    const view = await insert('see these words now', 4, 15)
    expect(view.state.doc.toString()).toBe('see these words now')
  })

  it('obliges a dotted token that only looks like an address, since you asked for it', async () => {
    const view = await insert('see App.tsx now', 4, 11)
    expect(view.state.doc.toString()).toBe('see [App.tsx](https://App.tsx) now')
  })

  it('declines on an empty selection', async () => {
    const view = await insert(`see ${URL} now`, 4, 4)
    expect(view.state.doc.toString()).toBe(`see ${URL} now`)
  })
})
