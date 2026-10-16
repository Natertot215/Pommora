// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '../../Contract/result'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import {
  type LinkAction,
  type LinkMenuAction,
  connectionMenuModel,
} from '../../Actions/connectionMenu'
import type { ConnectionsApi } from './connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'
import { showConnectionMenu } from '../../Interface/Menus/connectionMenuActions'
import {
  cleanupEditor,
  mountEditor,
  settleTitle,
  stubEditorBridge,
  testHost,
  typeInto,
} from '../../Testing/editorHarness'
import { MarkdownEditor } from '../MarkdownEditor'
import { applyEditorAction } from '../Menus/menu'
import { type LinkKind, linkTokenAt, tokenize } from '../Engine/tokens'
import { commitAliasOnEnter, linkEdit } from './linkEdit'

const connMenu = vi.fn<(req: unknown) => Promise<LinkMenuAction | null>>()
const writeClipboard = vi.fn()
stubEditorBridge({
  menu: async (req: unknown) => ok(await connMenu(req)),
  'clipboard:write': writeClipboard,
})

beforeEach(() => {
  connMenu.mockReset()
  connMenu.mockResolvedValue(null)
  writeClipboard.mockReset()
})
afterEach(async () => {
  await cleanupEditor()
})

const conn: ConnectionsApi = {
  index: buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  headingsOf: () => undefined,
  open: () => {},
  menu: showConnectionMenu,
}

async function rightClick(
  view: EditorView,
  pos: number,
  selector = '.md-connection-resolved',
): Promise<void> {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  const span = view.dom.querySelector(selector) as HTMLElement
  await act(async () => {
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

const caretTo = async (view: EditorView, anchor: number): Promise<void> => {
  await act(async () => {
    view.dispatch({ selection: { anchor } })
    await new Promise((r) => setTimeout(r, 0))
  })
}

const PAGE_MENU = { kind: 'page', open: 'closed', windowed: false } as const

describe('the connection menu knows its span and its surface', () => {
  it('offers the authoring rows on an editable surface, alias or none', async () => {
    for (const [initialBody, pos] of [
      ['a [[Alpha]] b', 6],
      ['a [[Alpha|the one]] b', 12],
    ] as const) {
      connMenu.mockClear()
      const view = await mountEditor({ initialBody, connections: conn })
      await rightClick(view, pos)
      expect(connMenu).toHaveBeenCalledWith({
        items: connectionMenuModel({ ...PAGE_MENU, editable: true }),
        anchor: undefined,
      })
      await cleanupEditor()
    }
  })

  it('stands down inside the syntax, leaving the native menu', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 6 } })
    })
    await rightClick(view, 6)
    expect(connMenu).not.toHaveBeenCalled()
  })

  it('withholds it from a read-only surface', async () => {
    const view = await mountEditor({
      initialBody: 'a [[Alpha]] b',
      connections: conn,
      readOnly: true,
    })
    await rightClick(view, 6)
    expect(connMenu).toHaveBeenCalledWith({
      items: connectionMenuModel({ ...PAGE_MENU, editable: false }),
      anchor: undefined,
    })
  })
})

describe('Rename seats the caret in the alias slot', () => {
  it('Rename reuses a pipe that is already there rather than stacking a second', async () => {
    connMenu.mockResolvedValue('rename')
    const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
    await rightClick(view, 6)
    expect(view.state.doc.toString()).toBe('a [[Alpha|]] b')
    expect(view.state.selection.main.head).toBe(10)
  })
})

describe('a ] typed in a label is swallowed, as it is in an alias', () => {
  it('leaves the link whole', async () => {
    const view = await mountEditor({ initialBody: 'a [ab](Alpha) z', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 4)
    await typeInto(view, ']')
    expect(view.state.doc.toString()).toBe('a [ab](Alpha) z')
  })
})

describe('Enter finishes an alias or label without writing anything', () => {
  it('rests the caret on the closer and leaves the text alone', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 13 } })
    })
    await act(async () => {
      commitAliasOnEnter('page')(view)
    })
    expect(view.state.doc.toString()).toBe('a [[Alpha|the one]] b')
    expect(view.state.selection.main.head).toBe(19)
  })

  it('rests the caret past a markdown link from its label, empty or written', async () => {
    for (const [initialBody, written] of [
      ['a [the one](Alpha) b', 'a [the one](Alpha) b'],
      ['a [](Alpha) b', 'a [](Alpha) b'],
    ]) {
      const view = await mountEditor({ initialBody, connections: conn })
      await act(async () => {
        view.focus()
        view.dispatch({ selection: { anchor: 3 } })
      })
      await act(async () => {
        commitAliasOnEnter('page')(view)
        await new Promise((r) => setTimeout(r, 0))
      })
      expect(view.state.doc.toString()).toBe(written)
      expect(view.state.selection.main.head).toBe(written.indexOf(')') + 1)
      await cleanupEditor()
    }
  })

  it('declines in an alias left as written in an HTML block, so Enter still breaks the line', async () => {
    const view = await mountEditor({
      initialBody: '<div>\na [[Alpha|the one]] b\n</div>',
      connections: conn,
    })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 19 } })
    })
    expect(commitAliasOnEnter('page')(view)).toBe(false)
  })

  it('declines in a markdown label left as written in an HTML block, where a ] lands plainly', async () => {
    const view = await mountEditor({
      initialBody: '<div>\na [the one](Alpha) b\n</div>',
      connections: conn,
    })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 11 } })
    })
    expect(commitAliasOnEnter('page')(view)).toBe(false)
    const typed = view.state
      .facet(EditorView.inputHandler)
      .some((h) => h(view, 11, 11, ']', () => view.state.update()))
    expect(typed).toBe(false)
  })

  it('a [ typed in an alias lands plainly, since pairing it would open a link inside the link', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 13 } })
    })
    const handled = view.state
      .facet(EditorView.inputHandler)
      .some((h) => h(view, 13, 13, '[', () => view.state.update()))
    expect(handled).toBe(false)
    expect(view.state.doc.toString()).toBe('a [[Alpha|the one]] b')
  })

  it('declines in an alias inside code, so Enter still breaks the line', async () => {
    for (const [initialBody, anchor] of [
      ['```\na [[Alpha|the one]] b\n```', 17],
      ['a `[[Alpha|the one]]` b', 14],
      ['a [[Alpha|x `c` y]] b', 10],
      ['a `[x](Alpha)` b', 4],
      ['a [x `c` y](Alpha) b', 4],
    ] as const) {
      const view = await mountEditor({ initialBody, connections: conn })
      await act(async () => {
        view.focus()
        view.dispatch({ selection: { anchor } })
      })
      expect(commitAliasOnEnter('page')(view)).toBe(false)
      await cleanupEditor()
    }
  })

  it('declines outside an alias, so Enter still breaks the line', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 6 } })
    })
    expect(commitAliasOnEnter('page')(view)).toBe(false)
  })
})

describe('Rename and Edit Title land the caret where their names imply', () => {
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

  it('Edit Title selects the title behind the alias', async () => {
    connMenu.mockResolvedValue('editLink')
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await rightClick(view, 12)
    const sel = view.state.selection.main
    expect(view.state.doc.sliceString(sel.from, sel.to)).toBe('Alpha')
    expect(view.state.doc.toString()).toBe('a [[Alpha|the one]] b')
  })

  it('Remove Link writes the shown text and keeps the editor focused', async () => {
    connMenu.mockResolvedValue('link:remove')
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await rightClick(view, 12)
    expect(view.state.doc.toString()).toBe('a the one b')
    expect(view.hasFocus).toBe(true)
  })
})

const NO_TITLES = { get: (): string | null => null }

const edit = (text: string, action: LinkAction, titles = NO_TITLES) => {
  const tk = linkTokenAt<LinkKind>(tokenize(text), 0)
  if (!tk) throw new Error(`no link in ${text}`)
  return linkEdit(text, tk, action, titles)
}

const selected = (text: string, action: LinkAction): string | null => {
  const e = edit(text, action)
  return e?.kind === 'select' ? text.slice(e.range[0], e.range[1]) : null
}

const written = (text: string, action: LinkAction): string | null => {
  const e = edit(text, action)
  return e?.kind === 'write' ? text.slice(0, e.from) + e.text + text.slice(e.to) : null
}

describe('a pick turns into a selection or a write, for both syntaxes', () => {
  it('Rename selects an alias and Edit Title the title behind it', () => {
    expect(selected('[[P|a]]', 'rename')).toBe('a')
    expect(selected('[[P|a]]', 'editLink')).toBe('P')
  })

  it('Rename opens an alias after the title, or seats in one already open', () => {
    expect(edit('[[P]]', 'rename')).toEqual({ kind: 'write', from: 3, to: 3, text: '|', select: 4 })
    expect(edit('[[P|]]', 'rename')).toEqual({ kind: 'select', range: [4, 4] })
  })

  it('Rename on an emptied heading opens the alias after the hash', () => {
    expect(written('[[P#]]', 'rename')).toBe('[[P#|]]')
  })

  it('on a heading connection, Edit Title selects the page and Rename seats after the heading', () => {
    expect(selected('[[P#H]]', 'editLink')).toBe('P')
    expect(edit('[[P#H]]', 'rename')).toEqual({
      kind: 'write',
      from: 5,
      to: 5,
      text: '|',
      select: 6,
    })
  })

  it('a weblink’s Rename selects its label and Edit Link its address', () => {
    expect(selected('[x](https://a.com)', 'rename')).toBe('x')
    expect(selected('[x](https://a.com)', 'editLink')).toBe('https://a.com')
  })

  it('a markdown link naming a page edits its title as a connection does', () => {
    expect(selected('[x](Page)', 'editLink')).toBe('Page')
  })

  it('Remove Link writes the shown text', () => {
    expect(written('[x](https://a.com)', 'link:remove')).toBe('x')
    expect(written('[Notes \\[WIP\\]](https://a.com)', 'link:remove')).toBe('Notes [WIP]')
    expect(written('[[P|a]]', 'link:remove')).toBe('a')
    expect(written('[[P]]', 'link:remove')).toBe('P')
    expect(written('[[P#H]]', 'link:remove')).toBe('P § H')
    expect(written('[[#H]]', 'link:remove')).toBe('H')
  })

  it('Delete writes nothing in the link’s place', () => {
    expect(written('[x](https://a.com)', 'link:delete')).toBe('')
    expect(written('[[P|a]]', 'link:delete')).toBe('')
  })

  it('Format rewrites a weblink’s label, awaiting a title it has no cache for', () => {
    expect(written('[x](https://a.com)', 'format:link-short')).toBe('[a.com](https://a.com)')
    expect(written('[x](https://a.com)', 'format:link-full')).toBe('[https://a.com](https://a.com)')
    expect(edit('[x](https://a.com)', 'format:link-title')).toEqual({
      kind: 'write',
      from: 0,
      to: 18,
      text: '[a.com](https://a.com)',
      awaits: 'https://a.com',
    })
    const cached = { get: (): string | null => 'A Site' }
    expect(edit('[x](https://a.com)', 'format:link-title', cached)).toMatchObject({
      text: '[A Site](https://a.com)',
      awaits: undefined,
    })
  })

  it('a connection takes no Format', () => {
    expect(edit('[[P]]', 'format:link-short')).toBeNull()
  })
})

describe('the applier writes a weblink pick in the body', () => {
  const URL = 'https://www.example.com/a/b'
  const BODY = `a [Home](${URL}) b`

  const choose = async (action: LinkMenuAction, body = BODY): Promise<EditorView> => {
    connMenu.mockResolvedValue(action)
    const view = await mountEditor({ initialBody: body, connections: conn })
    await rightClick(view, 5, '.md-link')
    return view
  }

  it('offers the editing rows on an editable surface and none on a read-only one', async () => {
    for (const readOnly of [false, true]) {
      connMenu.mockClear()
      const view = await mountEditor({ initialBody: BODY, connections: conn, readOnly })
      await rightClick(view, 5, '.md-link')
      expect(connMenu).toHaveBeenCalledWith({
        items: connectionMenuModel({ kind: 'url', web: true, editable: !readOnly }),
        anchor: undefined,
      })
      await cleanupEditor()
    }
  })

  it('still copies the address', async () => {
    await choose('title:copylink')
    expect(writeClipboard).toHaveBeenCalledWith(URL)
  })

  it('stands the domain in until the title lands', async () => {
    const view = await choose('format:link-title')
    expect(view.state.doc.toString()).toBe(`a [example.com](${URL}) b`)
    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(`a [Example Domain](${URL}) b`)
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
  const URL = 'https://www.example.com/a/b'
  const insert = async (body: string, from: number, to: number): Promise<EditorView> => {
    const view = await mountEditor({ initialBody: body })
    view.dispatch({ selection: { anchor: from, head: to } })
    await act(async () => {
      applyEditorAction(view, 'link:insert')
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

describe('an editor reads its connections from its host', () => {
  it('draws a resolved connection with the index on the host and none on the component', async () => {
    const parent = document.createElement('div')
    document.body.appendChild(parent)
    const root = createRoot(parent)
    await act(async () => {
      root.render(
        createElement(MarkdownEditor, {
          initialBody: '[[Alpha]]',
          onChange: () => {},
          host: { ...testHost(), connections: () => conn },
        }),
      )
    })
    expect(parent.querySelector('.md-connection-resolved')?.textContent).toBe('Alpha')
    await act(async () => root.unmount())
    parent.remove()
  })
})
