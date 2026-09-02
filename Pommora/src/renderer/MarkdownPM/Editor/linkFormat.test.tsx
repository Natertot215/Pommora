// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ConnMenuAction } from '@shared/connMenu'
import { EDITOR_ACTION_PREFIX, INSERT_LINK_ACTION } from '@shared/editorMenu'
import { linkMarkdown } from '@shared/pasteLink'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { showConnectionMenu } from '@renderer/Links/connectionMenu'
import { applyEditorAction, claimEditorMenu } from './menu'
import { useSession } from '@renderer/store'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/Testing/editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const connMenu = vi.fn<(ctx: unknown) => Promise<ConnMenuAction | null>>()
const writeClipboard = vi.fn()
// The title never arrives over the bridge here — every test that needs one writes it into the shared
// cache directly, which is the same thing the fetch's own resolution does.
const linkTitles = { fetch: async () => ({ ok: false, error: { code: 'offline' } }) }
stubEditorBridge({ connMenu, writeClipboard, linkTitles })

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
  useSession.setState({ linkTitles: {} })
})
afterEach(async () => {
  await cleanupEditor()
})

/** Right-click the drawn label, then let the menu's promise chain settle. */
const rightClick = async (view: EditorView): Promise<void> => {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(5)
  const el = view.dom.querySelector('.md-link') as HTMLElement
  await act(async () => {
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    await Promise.resolve()
  })
}

/** Pop the link's menu with `action` already chosen, and answer with the document it left. */
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
      surface: 'editor',
      editable: true,
      hasAlias: false,
      external: true,
    })
  })

  it('offers none of them on a read-only surface', async () => {
    const view = await mountEditor({ initialBody: BODY, connections: conn, readOnly: true })
    await rightClick(view)
    expect(connMenu).toHaveBeenCalledWith({
      surface: 'editor',
      editable: false,
      hasAlias: false,
      external: true,
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
    useSession.setState({ linkTitles: { [URL]: 'Example Domain' } })
    const view = await choose('format:link-title')
    expect(view.state.doc.toString()).toBe(`a [Example Domain](${URL}) b`)
  })

  // The same deferral the paste path uses: the domain stands in, and the fetched title replaces it
  // through the pending-title anchor rather than through a second mechanism.
  it('stands the domain in until the title lands', async () => {
    const view = await choose('format:link-title')
    expect(view.state.doc.toString()).toBe(`a [example.com](${URL}) b`)
    await act(async () => {
      useSession.setState({ linkTitles: { [URL]: 'Example Domain' } })
    })
    expect(view.state.doc.toString()).toBe(`a [Example Domain](${URL}) b`)
  })

  // A label Format writes and a label the paste path writes are the same words for the same address,
  // or a link formatted by hand reads differently from one pasted in that mode.
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

  // Both halves are selected rather than merely reached: each is a thing you replace outright.
  it('Edit Link selects the address', async () => {
    const view = await choose('editLink')
    const sel = view.state.selection.main
    expect(view.state.sliceDoc(sel.from, sel.to)).toBe(URL)
  })

  it('Remove Link leaves the label as prose', async () => {
    const view = await choose('link:remove')
    expect(view.state.doc.toString()).toBe('a Home b')
  })

  // The escapes belong to the link syntax the label was surviving; as prose it is just the words.
  it('Remove Link unescapes what the syntax made the label carry', async () => {
    const view = await choose('link:remove', `a [Notes \\[WIP\\]](${URL}) b`)
    expect(view.state.doc.toString()).toBe('a Notes [WIP] b')
  })

  it('Delete takes the whole link', async () => {
    const view = await choose('link:delete')
    expect(view.state.doc.toString()).toBe('a  b')
  })

  // A native menu can be held open for as long as the user likes, and the document is free to move
  // underneath it — the span the menu was popped on may no longer be in the document at all.
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

// An address already sitting in the prose as ordinary text. Format ▸ Link opens an empty target for
// words you have yet to point anywhere; this one points the address at itself.
describe('Insert Link over a selected address', () => {
  const insert = async (body: string, from: number, to: number): Promise<EditorView> => {
    const view = await mountEditor({ initialBody: body })
    // The menu is raised over the editor you clicked into, which is the claim focus makes.
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

  // The label is the address you were looking at; the target is the one that opens.
  it('gives a schemeless address the scheme it needs to open', async () => {
    const view = await insert('see example.com now', 4, 15)
    expect(view.state.doc.toString()).toBe('see [example.com](https://example.com) now')
  })

  it('declines on a selection no address could be read from', async () => {
    const view = await insert('see these words now', 4, 15)
    expect(view.state.doc.toString()).toBe('see these words now')
  })

  // The gate is validity, not intent — the same one Paste As uses, and for the same reason: a paste
  // that formats on its own has to guess, where selecting a filename and asking for a link does not.
  it('obliges a dotted token that only looks like an address, since you asked for it', async () => {
    const view = await insert('see App.tsx now', 4, 11)
    expect(view.state.doc.toString()).toBe('see [App.tsx](https://App.tsx) now')
  })

  it('declines on an empty selection', async () => {
    const view = await insert(`see ${URL} now`, 4, 4)
    expect(view.state.doc.toString()).toBe(`see ${URL} now`)
  })
})
