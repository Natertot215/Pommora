// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { matchText } from '@pommora/uix/Menus/menu-row.css'
import type { ConnectionsApi } from '../Links/connectionsApi'
import type { EditorSettings } from '../api'
import { buildPageIndex } from '../../Connections/pageIndex'
import {
  cleanupEditor,
  harnessState,
  mountEditor,
  seedHost,
  stubEditorBridge,
  typeInto,
} from '../../Testing/editorHarness'

stubEditorBridge()
afterEach(async () => {
  seedHost({})
  await cleanupEditor()
})

const conn: ConnectionsApi = {
  ...buildPageIndex([
    { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
    { id: 'pOld', title: 'Old', path: 'Old.md' },
    { id: 'pOlder', title: 'Older', path: 'Older.md' },
    { id: 'pGamma', title: 'Gamma', path: 'Gamma.md' },
    { id: 'p2', title: 'Project', path: 'Project.md' },
  ]),
  headingsOf: () => undefined,
  location: () => [],
  open: () => {},
}
const coords = { left: 10, right: 10, top: 10, bottom: 20 }

const press = async (view: EditorView, key: string): Promise<void> => {
  await act(async () => {
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
}

const mounted = async (body: string, settings: Partial<EditorSettings> = {}) => {
  const view = await mountEditor({ initialBody: body, connections: conn, host: { settings } })
  vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
  await act(async () => view.focus())
  return view
}

async function pickFirst(body: string, caret: number): Promise<{ doc: string; head: number }> {
  const view = await mountEditor({ initialBody: body, connections: conn })
  vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
  await act(async () => {
    view.focus()
    view.dispatch({ selection: { anchor: caret } })
  })
  expect(document.querySelector('.mdpm-ac')).toBeTruthy()
  await press(view, 'Enter')
  return { doc: view.state.doc.toString(), head: view.state.selection.main.head }
}

describe('committing a connection leaves it reading as finished', () => {
  it('writes the link alone and rests the caret on its closer', async () => {
    const { doc, head } = await pickFirst('[[Alp]]', 4)
    expect(doc).toBe('[[Alpha]]')
    expect(head).toBe(9)
  })

  it('leaves the text that follows exactly as it was', async () => {
    const { doc, head } = await pickFirst('[[Alp]] rest', 4)
    expect(doc).toBe('[[Alpha]] rest')
    expect(head).toBe(9)
  })
})

describe('the alias picker', () => {
  const props = {
    initialBody: '[[Alpha|]]',
    connections: conn,
    host: { aliases: { p1: ['one', 'two'] } },
  }

  const openPicker = async () => {
    const view = await mountEditor(props)
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 8 } })
    })
    return view
  }

  const rows = (): number => document.querySelectorAll('.mdpm-ac .mdpm-ac-forget').length

  it('drops a row the host stops remembering, under the same query', async () => {
    await openPicker()
    expect(rows()).toBe(2)
    await act(async () => harnessState().host.aliases.forget('p1', 'two'))
    expect(rows()).toBe(1)
  })

  it('remembers the alias a pick writes', async () => {
    const view = await openPicker()
    const remember = vi.spyOn(harnessState().host.aliases, 'remember')
    await act(async () => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('[[Alpha|one]]')
    expect(remember).toHaveBeenCalledTimes(1)
    expect(remember).toHaveBeenCalledWith('p1', 'one')
  })
})

describe('Tab with the picker open', () => {
  it('takes Tab as the pick, before a list line could nest', async () => {
    const view = await mountEditor({ initialBody: '- [[Alp]]', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 6 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await press(view, 'Tab')
    expect(view.state.doc.toString()).toBe('- [[Alpha]]')
  })
})

describe('the picker stands down when it has nothing to add', () => {
  it('a sole suggestion identical to what is written opens no panel', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha]]', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeNull()
  })

  it('refuses a click on a row held through the closing animation', async () => {
    const view = await mountEditor({ initialBody: '[[Alp]]', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await act(async () => {
      view.dispatch({ changes: { from: 5, insert: 'ha' }, selection: { anchor: 7 } })
    })
    const held = document.querySelector(`.mdpm-ac .${matchText}`)
    expect(held).toBeTruthy()
    await act(async () => {
      held?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    })
    expect(view.state.doc.toString()).toBe('[[Alpha]]')
  })

  it('reads no layout as it moves within the link', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha]] x', connections: conn })
    const measure = vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    const ownReads = () => measure.mock.calls.filter((args) => args.length === 1).length
    const settled = ownReads()
    for (const anchor of [5, 6, 5])
      await act(async () => {
        view.dispatch({ selection: { anchor } })
      })
    expect(ownReads()).toBe(settled)
  })

  it('opens again where the caret returns after a blur', async () => {
    const view = await mountEditor({ initialBody: '[[Alp]] x', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    await act(async () => {
      view.contentDOM.dispatchEvent(new FocusEvent('blur'))
      await new Promise((r) => setTimeout(r, 300))
    })
    expect(document.querySelector('.mdpm-ac')).toBeNull()
    await act(async () => {
      view.dispatch({ selection: { anchor: 5 }, userEvent: 'select.pointer' })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
  })

  it('but a partial query still opens it', async () => {
    const view = await mountEditor({ initialBody: '[[Alp]]', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
  })
})

describe('an unclosed opener with Pair Brackets off', () => {
  it('opens the pane, and Enter writes the closer with the caret after it', async () => {
    const view = await mounted('', { pairBrackets: false })
    await typeInto(view, '[[Pro')
    expect(view.state.doc.toString()).toBe('[[Pro')
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[Project]]')
    expect(view.state.selection.main.head).toBe('[[Project]]'.length)
  })

  it('a title typed in full still finishes on Enter', async () => {
    const view = await mounted('', { pairBrackets: false })
    await typeInto(view, '[[Pro')
    await typeInto(view, 'ject')
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[Project]]')
  })

  it('Escape leaves the typed text', async () => {
    const view = await mounted('', { pairBrackets: false })
    await typeInto(view, '[[Pro')
    await press(view, 'Escape')
    expect(view.state.doc.toString()).toBe('[[Pro')
  })
})

describe('the alias list slides in only when a pick opened its slot', () => {
  const props = { connections: conn, host: { aliases: { p1: ['one'] } } }
  const pageRowShown = (): boolean =>
    document.querySelector('.mdpm-ac')?.textContent?.includes('Alpha') ?? false

  it('slides in after a pick, behind the page rows', async () => {
    const view = await mountEditor({ initialBody: '[[Alp]]', ...props })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('one')
    expect(pageRowShown()).toBe(true)
  })

  it('stays put when the caret walks into a typed |, even from an open page list', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha|]] [[Alp]]', ...props })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 15 } })
    })
    expect(pageRowShown()).toBe(true)
    await act(async () => {
      view.dispatch({ selection: { anchor: 8 } })
    })
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('one')
    expect(pageRowShown()).toBe(false)
  })
})

describe('a pick retargets the link the picker opened on', () => {
  it('a label typed while the link is written stays, with Pair Brackets on', async () => {
    const view = await mounted('[x]')
    await act(async () => {
      view.dispatch({ selection: { anchor: 3 } })
    })
    await typeInto(view, '(Al')
    expect(view.state.doc.toString()).toBe('[x](Al)')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[x](Alpha)')
  })

  it('and with Pair Brackets off', async () => {
    const view = await mounted('', { pairBrackets: false })
    await typeInto(view, '[x](Al')
    expect(view.state.doc.toString()).toBe('[x](Al')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[x](Alpha)')
  })

  it.each([
    ['[Mine](Old) x', 7, 10, 'Gam', true, '[Gamma](Gamma) x'],
    ['[Mine](Old) x', 7, 10, 'Gam', false, '[Mine](Gamma) x'],
    ['[[Old|Mine]] x', 2, 5, 'Gam', true, '[[Gamma|]] x'],
    ['[[Old|Mine]] x', 2, 5, 'Gam', false, '[[Gamma|Mine]] x'],
    ['[[Old|Mine]] x', 2, 5, 'Ol', true, '[[Old|Mine]] x'],
    ['[[Nope|Mine]] x', 2, 6, 'Gam', true, '[[Gamma|Mine]] x'],
  ] as const)('%s, %i to %i selected and retyped as %s, dropping titles: %s, writes %s', async (...row) => {
    const [body, from, to, insert, removeTitleOnLinkChange, written] = row
    seedHost({ aliases: { pOld: ['Mine'], pGamma: ['Gee'] } })
    const view = await mounted(body, { removeTitleOnLinkChange })
    for (const selection of [{ anchor: to }, { anchor: from, head: to }])
      await act(async () => {
        view.dispatch({ selection })
      })
    await act(async () => {
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length },
        userEvent: 'input.type',
      })
    })
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe(written)
  })
})

describe('the chevron slides in a page’s headings', () => {
  const headingConn: ConnectionsApi = {
    ...buildPageIndex([
      { id: 'pNotes', title: 'Notes', path: 'Notes.md' },
      { id: 'pBlank', title: 'Blank', path: 'Blank.md' },
    ]),
    headingsOf: (path) =>
      path === 'Notes.md'
        ? { keys: ['setup'], texts: ['Setup'], outline: [{ text: 'Setup', level: 2 }] }
        : { keys: [], texts: [], outline: [] },
    location: () => [],
    open: () => {},
  }

  it('the arrow-right chevron opens the fragment and lists the page’s headings', async () => {
    const view = await mountEditor({ initialBody: '[[Not]]', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await press(view, 'ArrowRight')
    expect(view.state.doc.toString()).toBe('[[Notes#]]')
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })

  it('Return on a heading row finishes the link past the closer', async () => {
    const view = await mountEditor({ initialBody: '[[Not]]', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    await press(view, 'ArrowRight')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[Notes#Setup]]')
  })

  it('the alias slide follows a heading commit when the page has aliases', async () => {
    seedHost({ aliases: { pNotes: ['the notes'] } })
    const view = await mountEditor({ initialBody: '[[Not]]', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    for (const key of ['ArrowRight', 'Enter']) await press(view, key)
    expect(view.state.doc.toString()).toBe('[[Notes#Setup|]]')
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('the notes')
  })

  it('an abandoned heading slot drops its # when the caret leaves', async () => {
    const view = await mountEditor({ initialBody: '[[Not]] tail', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    await press(view, 'ArrowRight')
    expect(view.state.doc.toString()).toBe('[[Notes#]] tail')
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('[[Notes]] tail')
  })

  it('arrow-left backs the fragment out again', async () => {
    const view = await mountEditor({ initialBody: '[[Not]]', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    await press(view, 'ArrowRight')
    expect(view.state.doc.toString()).toBe('[[Notes#]]')
    await press(view, 'ArrowLeft')
    expect(view.state.doc.toString()).toBe('[[Notes]]')
  })

  it('a bare # lists the current document’s own headings', async () => {
    const body = '## Setup\n\n[[#]]'
    const view = await mountEditor({ initialBody: body, connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: body.lastIndexOf('#') + 1 } })
    })
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })

  it('a page’s headings list from the index, nested by level and each once', async () => {
    const outline = [
      { text: 'Intro', level: 1 },
      { text: 'Setup', level: 2 },
      { text: 'Usage', level: 1 },
      { text: 'Setup', level: 2 },
    ]
    const nested: ConnectionsApi = {
      ...headingConn,
      headingsOf: () => ({
        keys: ['intro', 'setup', 'usage'],
        texts: outline.map((h) => h.text),
        outline,
      }),
    }
    const body = '[[Notes#]]'
    const view = await mountEditor({ initialBody: body, connections: nested })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: body.indexOf('#') + 1 } })
    })
    const pane = document.querySelector('.mdpm-ac') as HTMLElement
    expect(pane.textContent).toBe('IntroSetupUsage')
    expect(pane.querySelectorAll('[data-drop-outline]')).toHaveLength(1)
  })

  it('a bare # lists a heading typed moments ago', async () => {
    const view = await mountEditor({ initialBody: '[[#]]', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ changes: { from: 0, insert: '## Fresh\n\n' }, selection: { anchor: 0 } })
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length - 2 } })
    })
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Fresh')
  })

  it('a heading fragment on a page with none closes the pane', async () => {
    const body = '[[Blank#]]'
    const view = await mountEditor({ initialBody: body, connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: body.indexOf('#') + 1 } })
    })
    expect(document.querySelectorAll('.mdpm-ac [class*="item"]')).toHaveLength(0)
  })

  // The same slide, written into a markdown link's destination.
  it('the chevron in ( ) writes the page and its #, lists its headings, and Return finishes past the )', async () => {
    const view = await mountEditor({ initialBody: '[x](Not)', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    await press(view, 'ArrowRight')
    expect(view.state.doc.toString()).toBe('[x](Notes#)')
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[x](Notes#Setup)')
    expect(view.state.selection.main.head).toBe(view.state.doc.length)
  })

  it('a bare # in ( ) lists the current document’s own headings', async () => {
    const body = '## Setup\n\n[x](#)'
    const view = await mountEditor({ initialBody: body, connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: body.lastIndexOf('#') + 1 } })
    })
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })

  it('a typed § in prose lists the headings as the heading form does', async () => {
    const body = '## Setup\n\nsee '
    const view = await mountEditor({
      initialBody: body,
      connections: headingConn,
      host: { settings: { inPageHeadingResolution: 'automatic' } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({
        changes: { from: body.length, insert: '§' },
        selection: { anchor: body.length + 1 },
        userEvent: 'input.type',
      })
    })
    expect(document.querySelector('.mdpm-ac [data-drop-outline-spacer]')).not.toBeNull()
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })

  it('ArrowRight on a page row in an empty ( ) opens its headings', async () => {
    const view = await mountEditor({ initialBody: 'a [sel]() b', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 8 } })
    })
    await press(view, 'ArrowRight')
    expect(view.state.doc.toString()).toBe('a [sel](Blank#) b')
  })

  // Unlike `[[Page#]]`, an empty fragment means something to every Markdown reader: the top of the page.
  it('a markdown link to (#) keeps its # as the caret passes through', async () => {
    const view = await mountEditor({ initialBody: 'see [top](#) tail', connections: headingConn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 11 } })
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('see [top](#) tail')
  })
})
