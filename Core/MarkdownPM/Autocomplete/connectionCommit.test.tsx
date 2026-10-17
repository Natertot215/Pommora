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
  index: buildPageIndex([
    { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
    { id: 'pOld', title: 'Old', path: 'Old.md' },
    { id: 'pOlder', title: 'Older', path: 'Older.md' },
    { id: 'pGamma', title: 'Gamma', path: 'Gamma.md' },
    { id: 'p2', title: 'Project', path: 'Project.md' },
  ]),
  headingsOf: () => undefined,
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

  const rows = (): number =>
    document.querySelectorAll('.mdpm-ac [aria-label="Delete alias"]').length

  it('drops a row the host stops remembering, under the same query', async () => {
    await openPicker()
    expect(rows()).toBe(2)
    await act(async () => harnessState().host.aliases.edit('p1', { op: 'forget', alias: 'two' }))
    expect(rows()).toBe(1)
  })

  it('remembers the alias a pick writes', async () => {
    const view = await openPicker()
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('[[Alpha|one]]')
    expect(edit).toHaveBeenCalledTimes(1)
    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'one' })
  })
})

describe('a markdown link’s label lists its page’s aliases', () => {
  const host = { aliases: { p1: ['one', 'two'] } }
  const inLabel = async (initialBody: string) => {
    const view = await mountEditor({ initialBody, connections: conn, host })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 3 } })
    })
    return view
  }
  const listed = (): string[] =>
    [...document.querySelectorAll('.mdpm-ac [aria-label="Delete alias"]')].map(
      (x) => x.closest('[data-reveal]')?.textContent?.trim() ?? '',
    )

  it('an empty label lists them all, and a pick writes one and rests past the link', async () => {
    const view = await inLabel('a [](Alpha) b')
    expect(listed()).toEqual(['one', 'two'])
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('a [one](Alpha) b')
    expect(view.state.selection.main.head).toBe('a [one](Alpha)'.length)
  })

  it('a written label filters them', async () => {
    await inLabel('a [t](Alpha) b')
    expect(listed()).toEqual(['two'])
  })

  it('a label naming a website lists nothing', async () => {
    await inLabel('a [](https://example.com) b')
    expect(document.querySelector('.mdpm-ac')).toBeNull()
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
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[x](Alpha)')
    expect(edit).toHaveBeenCalledTimes(1)
    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'x' })
  })

  it('and with Pair Brackets off', async () => {
    const view = await mounted('', { pairBrackets: false })
    await typeInto(view, '[x](Al')
    expect(view.state.doc.toString()).toBe('[x](Al')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[x](Alpha)')
  })

  it('a label typed before a destination that never closed stays with Remove Title on', async () => {
    const view = await mounted('', { pairBrackets: false, removeTitleOnLinkChange: true })
    await typeInto(view, '[Nice](Alpha')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[Nice](Alpha)')
  })

  it.each([
    ['[Mine](Old) x', 7, 10, 'Gam', true, '[](Gamma) x', '[Gamma](Gamma) x', null],
    ['[Mine](Old) x', 7, 10, 'Gam', false, '[Mine](Gamma) x', '[Mine](Gamma) x', 'pGamma'],
    ['[[Old|Mine]] x', 2, 5, 'Gam', true, '[[Gamma|]] x', '[[Gamma]] x', null],
    ['[[Old|Mine]] x', 2, 5, 'Gam', false, '[[Gamma|Mine]] x', '[[Gamma|Mine]] x', 'pGamma'],
    ['[[Old|Mine]] x', 2, 5, 'Ol', true, '[[Old|Mine]] x', '[[Old|Mine]] x', null],
    ['[[Nope|Mine]] x', 2, 6, 'Gam', true, '[[Gamma|Mine]] x', '[[Gamma|Mine]] x', 'pGamma'],
    ['[Old](Old) x', 6, 9, 'Gam', false, '[Old](Gamma) x', '[Old](Gamma) x', null],
  ] as const)('%s, %i to %i selected and retyped as %s, dropping titles: %s, writes %s, leaves %s, and gives Mine to %s', async (...row) => {
    const [body, from, to, insert, removeTitleOnLinkChange, written, left, remembers] = row
    seedHost({ aliases: { pOld: ['Mine'], pGamma: ['Gee'] } })
    const view = await mounted(body, { removeTitleOnLinkChange })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
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
    expect(!!document.querySelector('.mdpm-ac [aria-label="Add alias"]')).toBe(written !== left)
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe(left)
    expect(edit.mock.calls).toEqual(remembers ? [[remembers, { op: 'add', alias: 'Mine' }]] : [])
  })
})

describe('a pick into an emptied slot rewrites the whole link around it', () => {
  it.each([
    ['[[Old|Mine]] x', 2, 5, '[[Alpha|Mine]] x'],
    ['[Mine](Old) x', 7, 10, '[Mine](Alpha) x'],
  ] as const)('%s, %i to %i deleted and Alpha picked, writes %s', async (body, from, to, written) => {
    const view = await mounted(body, { removeTitleOnLinkChange: false })
    await act(async () => {
      view.dispatch({ selection: { anchor: from, head: to } })
    })
    await act(async () => {
      view.dispatch({
        changes: { from, to },
        selection: { anchor: from },
        userEvent: 'delete.selection',
      })
    })
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe(written)
  })

  it.each([
    ['[sel](#Setup) x', 6, '[Setup](Alpha#Setup) x'],
    ['[[#Setup|sel]]', 2, '[[Alpha#Setup]]'],
  ] as const)('%s, picked at %i with Remove Title on, drops the text this document’s own heading showed: %s', async (body, caret, written) => {
    const view = await mounted(body, { removeTitleOnLinkChange: true })
    await act(async () => {
      view.dispatch({ selection: { anchor: caret } })
    })
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe(written)
  })
})

describe('the chevron slides in a page’s headings', () => {
  const headingConn: ConnectionsApi = {
    index: buildPageIndex([
      { id: 'pNotes', title: 'Notes', path: 'Notes.md' },
      { id: 'pBlank', title: 'Blank', path: 'Blank.md' },
    ]),
    headingsOf: (path) =>
      path === 'Notes.md'
        ? {
            keys: ['setup', 'usage'],
            texts: ['Setup', 'Usage'],
            outline: [
              { text: 'Setup', level: 2 },
              { text: 'Usage', level: 2 },
            ],
          }
        : { keys: [], texts: [], outline: [] },
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

  it.each([
    ['[[Not]]', '[[Notes#Setup|]]', '[[Notes#Setup|'.length],
    ['[](Not)', '[](Notes#Setup)', 1],
  ])('the alias slide follows a heading commit when the page has aliases: %s', async (initialBody, written, slot) => {
    seedHost({ aliases: { pNotes: ['the notes'] } })
    const view = await mountEditor({ initialBody, connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    for (const key of ['ArrowRight', 'Enter']) await press(view, key)
    expect(view.state.doc.toString()).toBe(written)
    expect(view.state.selection.main.head).toBe(slot)
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
    expect(document.querySelector('.mdpm-ac')).toBeNull()
  })

  // The same slide, written into a markdown link's destination.
  it('the chevron in ( ) writes the page and its #, lists its headings, and Return finishes past the ), remembering nothing from a link naming a heading', async () => {
    const view = await mountEditor({ initialBody: '[x](Not)', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
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
    expect(edit.mock.calls).toEqual([])
  })

  it('the chevron leaves an empty label, which the heading fills once the pick rests past the link', async () => {
    const view = await mountEditor({ initialBody: '[](Not)', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    await press(view, 'ArrowRight')
    expect(view.state.doc.toString()).toBe('[](Notes#)')
    await press(view, 'Enter')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('[Setup](Notes#Setup)')
  })

  it('the chevron keeps an alias a retarget keeps, as a markdown link keeps its label', async () => {
    const view = await mountEditor({
      initialBody: '[[Nope|Mine]] x',
      connections: headingConn,
      host: { settings: { removeTitleOnLinkChange: false } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 2, head: 6 } })
    })
    await act(async () => {
      view.dispatch({
        changes: { from: 2, to: 6, insert: 'Not' },
        selection: { anchor: 5 },
        userEvent: 'input.type',
      })
    })
    await press(view, 'ArrowRight')
    expect(view.state.doc.toString()).toBe('[[Notes#|Mine]] x')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[Notes#Setup|Mine]] x')
    expect(view.state.selection.main.head).toBe('[[Notes#Setup|Mine]]'.length)
  })

  it.each([
    ['[[Notes#Setup|Mine]]', true, '[[Notes#Usage]]'],
    ['[[Notes#Setup|Mine]]', false, '[[Notes#Usage|Mine]]'],
    ['[Setup](Notes#Setup)', true, '[Usage](Notes#Usage)'],
  ] as const)('%s re-picked to Usage, dropping titles: %s, writes %s', async (body, removeTitleOnLinkChange, written) => {
    const view = await mountEditor({
      initialBody: body,
      connections: headingConn,
      host: { settings: { removeTitleOnLinkChange } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    const from = body.indexOf('Setup', 3)
    const to = from + 'Setup'.length
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: from, head: to } })
    })
    await act(async () => {
      view.dispatch({
        changes: { from, to, insert: 'Us' },
        selection: { anchor: from + 2 },
        userEvent: 'input.type',
      })
    })
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe(written)
  })

  it('a heading picked into a link that pointed nowhere keeps its alias with Remove Title on', async () => {
    const view = await mountEditor({
      initialBody: '[[Nope|Mine]] x',
      connections: headingConn,
      host: { settings: { removeTitleOnLinkChange: true } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 2, head: 6 } })
    })
    await act(async () => {
      view.dispatch({
        changes: { from: 2, to: 6, insert: 'Not' },
        selection: { anchor: 5 },
        userEvent: 'input.type',
      })
    })
    await press(view, 'ArrowRight')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[Notes#Setup|Mine]] x')
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

describe('a pick names the page as a new link should, and the picker closes on a finished link', () => {
  const shared: ConnectionsApi = {
    index: buildPageIndex([
      { id: 'nA', title: 'Notes', path: 'A/Notes.md' },
      { id: 'nB', title: 'Notes', path: 'B/Notes.md' },
      { id: 'cP', title: 'ClaudeMD', path: 'Studio/Pommora/ClaudeMD.md' },
      { id: 'cS', title: 'ClaudeMD', path: 'Studio/Sapphire/ClaudeMD.md' },
    ]),
    headingsOf: (path) =>
      path === 'A/Notes.md'
        ? { keys: ['intro'], texts: ['Intro'], outline: [{ text: 'Intro', level: 2 }] }
        : { keys: [], texts: [], outline: [] },
    open: () => {},
  }
  const unique: ConnectionsApi = {
    index: buildPageIndex([
      { id: 'n', title: 'Notes', path: 'Notes.md' },
      { id: 'nX', title: 'Notes Archive', path: 'Notes Archive.md' },
      { id: 'pg', title: 'Page', path: 'Page.md' },
    ]),
    headingsOf: (path) =>
      path === 'Page.md'
        ? {
            keys: ['setup', 'setup 2'],
            texts: ['Setup', 'Setup 2'],
            outline: [
              { text: 'Setup', level: 2 },
              { text: 'Setup 2', level: 2 },
            ],
          }
        : undefined,
    open: () => {},
  }
  const at = async (body: string, caret: number, connections: ConnectionsApi) => {
    const view = await mountEditor({ initialBody: body, connections })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: caret } })
    })
    return view
  }
  const rows = (): string[] =>
    [...document.querySelectorAll(`.mdpm-ac .${matchText}`)].map((x) => x.textContent ?? '')

  it('a pick of one of two Notes writes its path and rests past it', async () => {
    const view = await at('[[Not]]', 5, shared)
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[A/Notes|Notes]]')
    expect(view.state.selection.main.head).toBe('[[A/Notes|Notes]]'.length)
  })

  it('re-picking the same holder with Remove Title on keeps the alias', async () => {
    const view = await at('[[A/Notes|x]]', 4, shared)
    await act(async () => {
      view.dispatch({ selection: { anchor: 2, head: 9 } })
    })
    await act(async () => {
      view.dispatch({
        changes: { from: 2, to: 9, insert: 'Not' },
        selection: { anchor: 5 },
        userEvent: 'input.type',
      })
    })
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[A/Notes|x]]')
  })

  it('a pick keeps the heading the picked page holds, and drops one it lacks', async () => {
    const view = await at('[[Notes#Intro|A]]', 4, shared)
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[A/Notes#Intro|A]]')
    await cleanupEditor()
    const other = await at('[[Notes#Intro|A]]', 4, shared)
    await press(other, 'ArrowDown')
    await press(other, 'Enter')
    expect(other.state.doc.toString()).toBe('[[B/Notes|A]]')
  })

  it('a pick inside an embed writes no alias', async () => {
    const view = await at('![[Notes', 8, shared)
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('![[A/Notes]]')
  })

  it('the chevron on a holder checks the link as it writes it, without the heading it opens', async () => {
    const view = await mountEditor({
      initialBody: '[[A/Notes#Intro|A]] tail',
      connections: shared,
      host: { settings: { removeTitleOnLinkChange: true } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 2, head: 9 } })
    })
    await act(async () => {
      view.dispatch({
        changes: { from: 2, to: 9, insert: 'Not' },
        selection: { anchor: 5 },
        userEvent: 'input.type',
      })
    })
    await press(view, 'ArrowRight')
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('[[A/Notes]] tail')
  })

  it('a finished title opens nothing, even beside a longer one or as a path', async () => {
    await at('[[Notes]]', 4, unique)
    expect(document.querySelector('.mdpm-ac')).toBeNull()
    await cleanupEditor()
    await at('[[Pommora/ClaudeMD]]', 4, shared)
    expect(document.querySelector('.mdpm-ac')).toBeNull()
  })

  it('an ambiguous title opens on both holders', async () => {
    await at('[[Notes]]', 4, shared)
    expect(rows()).toEqual(['Notes', 'Notes'])
  })

  it('an ambiguous title written with its extension lists its holders', async () => {
    await at('[[Notes.md]]', 4, shared)
    expect(rows()).toEqual(['Notes', 'Notes'])
  })

  it('an ambiguous title lists its holders first and the longer titles after them', async () => {
    const archive: ConnectionsApi = {
      ...shared,
      index: buildPageIndex([
        { id: 'nA', title: 'Notes', path: 'A/Notes.md' },
        { id: 'nB', title: 'Notes', path: 'B/Notes.md' },
        { id: 'ar', title: 'Notes Archive', path: 'A/Notes Archive.md' },
      ]),
    }
    await at('[[Notes]]', 4, archive)
    const asides = [...document.querySelectorAll('.mdpm-ac-aside')].map((x) =>
      x.getAttribute('aria-label'),
    )
    expect(asides).toEqual(['Headings of Notes', 'Headings of Notes', 'Headings of Notes Archive'])
  })

  it('a finished heading opens nothing beside a longer one', async () => {
    await at('[[Page#Setup]]', 10, unique)
    expect(document.querySelector('.mdpm-ac')).toBeNull()
  })
})
