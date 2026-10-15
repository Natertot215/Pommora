// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { connectionAt, inAliasAt } from '../Input/edits'
import { scanDoc } from '../Engine/docScan'
import { aliasRows, type HeadingRow } from './autocomplete'
import { AutocompletePane } from './AutocompletePane'
import { StateEffect } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { resting } from '@pommora/uix/Fields/fields.css'
import { firePointer, stubRect } from '@pommora/uix/Utilities/pointerHarness'
import { type EditorHost, heldPage } from '../api'
import { paneHeld } from '../Menus/caretPane'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'
import {
  cleanupEditor,
  harnessState,
  mountEditor,
  stubEditorBridge,
} from '../../Testing/editorHarness'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// The double-click window an alias row's single click waits out before it inserts.
const PICK_WAIT = 300

let remembered: Record<string, string[]> = {}
const aliases: EditorHost['aliases'] = {
  list: (id) => remembered[id] ?? [],
  edit: async () => true,
  subscribe: () => () => {},
}

beforeEach(() => {
  remembered = { p1: ['the plan', 'Q3 doc'] }
})

describe('the picker offers what a page has been called before', () => {
  it('offers every remembered alias on an empty query, in the stored order', () => {
    expect(aliasRows(aliases, 'p1', '').map((r) => r.value)).toEqual(['the plan', 'Q3 doc'])
  })

  it('filters by what has been typed', () => {
    expect(aliasRows(aliases, 'p1', 'the').map((r) => r.value)).toEqual(['the plan'])
    expect(aliasRows(aliases, 'p1', 'zzz')).toEqual([])
  })

  it('a page with nothing remembered offers nothing', () => {
    expect(aliasRows(aliases, 'p2', '')).toEqual([])
  })

  it('no page offers nothing', () => {
    expect(aliasRows(aliases, undefined, '')).toEqual([])
  })
})

describe('the body picker’s alias list', () => {
  const conn: ConnectionsApi = {
    ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
    headingsOf: () => undefined,
    location: () => [],
    open: () => {},
  }

  afterEach(async () => {
    vi.useRealTimers()
    await cleanupEditor()
  })

  const openPicker = async (menus: Partial<EditorHost['menus']> = {}): Promise<EditorView> => {
    stubEditorBridge()
    const view = await mountEditor({
      initialBody: '[[Alpha|]]',
      connections: conn,
      host: { aliases: { p1: ['the plan', 'Q3 doc'] }, menus },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 8 } })
    })
    return view
  }
  const rowOf = (text: string): HTMLElement =>
    [...document.querySelectorAll<HTMLElement>('.mdpm-ac [data-reveal]')].find(
      (r) => r.textContent === text,
    ) as HTMLElement
  const nameOf = (text: string): HTMLElement =>
    rowOf(text).querySelector(`.${resting}`) as HTMLElement
  const itemOf = (text: string): HTMLElement =>
    rowOf(text).querySelector('[role="button"]') as HTMLElement
  const input = (): HTMLInputElement | null =>
    document.querySelector<HTMLInputElement>('.mdpm-ac input[aria-label="Alias"]')
  const click = async (el: HTMLElement, detail: number): Promise<void> => {
    await act(async () => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
    })
  }
  const key = async (el: HTMLElement, k: string): Promise<void> => {
    await act(async () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
    })
  }
  const settle = async (): Promise<void> => {
    await act(async () => new Promise((r) => setTimeout(r, 0)))
  }

  it('draws each row with the alias glyph and its × at rest, and × deletes without inserting', async () => {
    const view = await openPicker()
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    expect(
      itemOf('the plan')
        .querySelector('[class*="side"] svg')
        ?.classList.contains('lucide-square-split-horizontal'),
    ).toBe(true)
    const x = rowOf('Q3 doc').querySelector('[aria-label="Delete alias"]') as HTMLElement
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    x.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
    await act(async () => x.click())
    expect(edit).toHaveBeenCalledWith('p1', { op: 'forget', alias: 'Q3 doc' })
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
  })

  it('a single click inserts once the double-click window passes, and a double-click renames instead', async () => {
    const view = await openPicker()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await click(itemOf('Q3 doc'), 1)
    await click(nameOf('Q3 doc'), 1)
    await click(nameOf('Q3 doc'), 2)
    await act(async () => {
      nameOf('Q3 doc').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
    })
    expect(input()?.value).toBe('Q3 doc')
    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
    await key(input() as HTMLInputElement, 'Escape')
    await act(async () => vi.advanceTimersByTime(0))
    await click(itemOf('the plan'), 1)
    await act(async () => vi.advanceTimersByTime(PICK_WAIT - 1))
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
    await act(async () => vi.advanceTimersByTime(1))
    expect(view.state.doc.toString()).toBe('[[Alpha|the plan]]')
  })

  it('a click insert pending while a character is typed into the slot inserts nothing', async () => {
    const view = await openPicker()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await click(itemOf('the plan'), 1)
    await act(async () => {
      view.dispatch({
        changes: { from: 8, insert: 't' },
        selection: { anchor: 9 },
        userEvent: 'input.type',
      })
    })
    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
    expect(view.state.doc.toString()).toBe('[[Alpha|t]]')
  })

  it('a click insert pending when the caret moves to another link’s slot inserts nothing there', async () => {
    stubEditorBridge()
    const view = await mountEditor({
      initialBody: '[[Alpha|]] [[Alpha|]]',
      connections: conn,
      host: { aliases: { p1: ['the plan', 'Q3 doc'] } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 8 } })
    })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await click(itemOf('the plan'), 1)
    await act(async () => {
      view.dispatch({ selection: { anchor: 19 } })
    })
    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
    expect(view.state.doc.toString()).not.toContain('the plan')
  })

  it('in a Text value held by a page with aliases, a heading picked from [[# opens no slot', async () => {
    stubEditorBridge()
    const view = await mountEditor({
      initialBody: '[[#]]',
      connections: {
        ...conn,
        headingsOf: () => ({
          keys: ['setup'],
          texts: ['Setup'],
          outline: [{ text: 'Setup', level: 2 }],
        }),
      },
      host: { aliases: { p1: ['the plan'] } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => {
      view.dispatch({
        effects: StateEffect.appendConfig.of(
          heldPage.of({ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }),
        ),
      })
      view.focus()
      view.dispatch({ selection: { anchor: 3 } })
    })
    expect((document.querySelector('.mdpm-ac') as HTMLElement).textContent).toContain('Setup')
    await key(view.contentDOM, 'Enter')
    expect(view.state.doc.toString()).toBe('[[#Setup]]')
  })

  it('+ drafts inside the open pane, keeping the pipe, and Enter adds and returns to the slot', async () => {
    const view = await openPicker()
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () =>
      (document.querySelector('[aria-label="Add alias"]') as HTMLElement).click(),
    )
    const draft = input() as HTMLInputElement
    expect(document.activeElement).toBe(draft)
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
    draft.value = 'roadmap'
    await key(draft, 'Enter')
    await settle()
    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'roadmap' })
    expect(view.hasFocus).toBe(true)
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
    expect(view.state.selection.main.head).toBe(8)
  })

  it('Escape in a rename returns to the slot', async () => {
    const view = await openPicker()
    await act(async () => {
      nameOf('the plan').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
    })
    expect(document.activeElement).toBe(input())
    await key(input() as HTMLInputElement, 'Escape')
    await settle()
    expect(view.hasFocus).toBe(true)
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
    expect(view.state.selection.main.head).toBe(8)
  })

  it('focus leaving a pane field for elsewhere closes the picker and collapses the empty slot', async () => {
    const view = await openPicker()
    const elsewhere = document.createElement('button')
    document.body.appendChild(elsewhere)
    await act(async () =>
      (document.querySelector('[aria-label="Add alias"]') as HTMLElement).click(),
    )
    expect(document.activeElement).toBe(input())
    await act(async () => elsewhere.focus())
    await settle()
    expect(view.state.doc.toString()).toBe('[[Alpha]]')
    expect(view.hasFocus).toBe(false)
    expect(input()).toBeNull()
    elsewhere.remove()
  })

  it('a heading committed into the alias stage leaves its heading rows behind as heading rows', async () => {
    stubEditorBridge()
    const view = await mountEditor({
      initialBody: '[[Alpha#]]',
      connections: {
        ...conn,
        headingsOf: () => ({
          keys: ['setup'],
          texts: ['Setup'],
          outline: [{ text: 'Setup', level: 2 }],
        }),
      },
      host: { aliases: { p1: ['the plan'] } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 8 } })
    })
    await key(view.contentDOM, 'Enter')
    expect(view.state.doc.toString()).toBe('[[Alpha#Setup|]]')
    const pane = document.querySelector('.mdpm-ac') as HTMLElement
    expect(pane.textContent).toContain('Setup')
    expect(pane.querySelector('.lucide-file-text')).toBeNull()
  })

  it('the row menu’s Rename opens the row’s input', async () => {
    await openPicker({ alias: async () => 'rename' })
    await act(async () => {
      itemOf('Q3 doc').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
    expect(input()?.value).toBe('Q3 doc')
  })

  const openOne = async (body = '[[Alpha|]]'): Promise<EditorView> => {
    stubEditorBridge()
    const view = await mountEditor({
      initialBody: body,
      connections: conn,
      host: { aliases: { p1: ['the plan'] } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 8 } })
    })
    return view
  }
  const plus = (): HTMLElement => document.querySelector('[aria-label="Add alias"]') as HTMLElement
  const xOf = (text: string): HTMLElement =>
    rowOf(text).querySelector('[aria-label="Delete alias"]') as HTMLElement

  it('with a draft open, × on the only alias keeps the pane and the draft, and Enter adds it back in the slot', async () => {
    const view = await openOne()
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => plus().click())
    const draft = input() as HTMLInputElement
    draft.value = 'roadmap'
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await act(async () => xOf('the plan').click())
    await act(async () => vi.advanceTimersByTime(1000))
    expect(edit).toHaveBeenCalledWith('p1', { op: 'forget', alias: 'the plan' })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    expect(input()).toBe(draft)
    expect(draft.value).toBe('roadmap')
    await key(draft, 'Enter')
    await act(async () => vi.advanceTimersByTime(0))
    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'roadmap' })
    expect(view.hasFocus).toBe(true)
    expect(view.state.field(paneHeld)).toBe(false)
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
    expect(view.state.selection.main.head).toBe(8)
  })

  it('with a rename open, an outside forget emptying the list ends the edit back in the slot', async () => {
    const view = await openOne()
    await act(async () => {
      nameOf('the plan').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
    })
    expect(view.state.field(paneHeld)).toBe(true)
    await act(async () => {
      await harnessState().host.aliases.edit('p1', { op: 'forget', alias: 'the plan' })
    })
    await settle()
    expect(input()).toBeNull()
    expect(view.state.field(paneHeld)).toBe(false)
    expect(view.hasFocus).toBe(true)
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
    expect(view.state.selection.main.head).toBe(8)
  })

  it('a remount of the list under an open field releases the hold', async () => {
    const view = await openOne()
    await act(async () => plus().click())
    expect(view.state.field(paneHeld)).toBe(true)
    await act(async () => {
      view.dispatch({ changes: { from: 0, insert: 'x ' } })
    })
    await settle()
    expect(view.state.field(paneHeld)).toBe(false)
  })

  it.each([
    ['+', () => plus().click()],
    [
      'the row menu',
      () =>
        itemOf('Q3 doc').dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        ),
    ],
    ['× on another row', () => xOf('Q3 doc').click()],
  ])('a click insert pending when %s is pressed inserts nothing', async (_, press) => {
    const view = await openPicker({ alias: async () => null })
    vi.spyOn(harnessState().host.aliases, 'edit').mockResolvedValue(true)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await click(itemOf('the plan'), 1)
    await act(async () => press())
    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
  })

  const lineRows = (): HTMLElement[] => [
    ...document.querySelectorAll<HTMLElement>('.mdpm-ac [data-line-row]'),
  ]
  const lift = async (from: number, toY: number): Promise<void> => {
    const zone = document.querySelector('.mdpm-ac .line-zone')
    if (zone) stubRect(zone, { top: 0, bottom: lineRows().length * 30 })
    for (const [i, el] of lineRows().entries()) stubRect(el, { top: i * 30, bottom: i * 30 + 30 })
    await act(async () => {
      firePointer(lineRows()[from], 'pointerdown', { x: 10, y: from * 30 + 15 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 10, y: toY })
    })
  }
  const drop = async (row: HTMLElement): Promise<void> => {
    await act(async () => {
      firePointer(window, 'pointerup')
      row.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
  }

  it('a drag sends the move, leaving the body unchanged, the editor focused, and nothing inserted', async () => {
    const view = await openPicker()
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await lift(1, 5)
    await drop(itemOf('Q3 doc'))
    expect(edit).toHaveBeenCalledExactlyOnceWith('p1', { op: 'move', alias: 'Q3 doc', toIndex: 0 })
    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
    expect(view.hasFocus).toBe(true)
  })

  it('a press under the activation distance still inserts', async () => {
    const view = await openPicker()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await lift(0, 17)
    await drop(itemOf('the plan'))
    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
    expect(view.state.doc.toString()).toBe('[[Alpha|the plan]]')
  })

  it('with a typed query, a press lifts nothing', async () => {
    const view = await openPicker()
    await act(async () => {
      view.dispatch({ changes: { from: 8, insert: 'Q' }, selection: { anchor: 9 } })
    })
    await lift(0, 100)
    expect(document.querySelector('.mdpm-ac .drop-line')).toBeNull()
    expect(lineRows()[0].hasAttribute('data-drag-source')).toBe(false)
    await act(async () => firePointer(window, 'pointerup'))
  })

  it('with a rename open, a press lifts nothing', async () => {
    await openPicker()
    await act(async () => {
      nameOf('the plan').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
    })
    await lift(1, 5)
    expect(document.querySelector('.mdpm-ac .drop-line')).toBeNull()
    expect(lineRows()[1].hasAttribute('data-drag-source')).toBe(false)
    await act(async () => firePointer(window, 'pointerup'))
  })
})

describe('the heading slide’s top row marks how it arrived', () => {
  let host: HTMLDivElement | null = null
  let root: Root | null = null

  afterEach(async () => {
    await act(async () => root?.unmount())
    host?.remove()
    root = null
    host = null
  })

  const headingAc = {
    query: '',
    from: 0,
    to: 0,
    form: 'heading' as const,
    closed: true,
    title: 'Notes',
    caretX: 0,
    caretTop: 0,
    caretBottom: 16,
    bounds: { left: 0, right: 1024 },
  }
  const rows: HeadingRow[] = [{ kind: 'heading', value: 'Setup', level: 1 }]

  const mount = async (slid: boolean): Promise<void> => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <AutocompletePane
          open
          ac={headingAc}
          candidates={rows}
          index={0}
          onPick={() => {}}
          behind={slid ? [] : null}
          headingRows={rows}
          collapsed={new Set()}
          onToggleHeading={() => {}}
          onAside={() => {}}
          onBack={() => {}}
          aliasHost={null}
        />,
      )
    })
  }

  it('the chevron slide shows a Links · Title top row', async () => {
    await mount(true)
    const pane = document.querySelector('.mdpm-ac') as HTMLElement
    expect(pane.textContent).toContain('Links')
    expect(pane.textContent).toContain('Notes')
  })

  it('a hand-typed # shows no top row', async () => {
    await mount(false)
    const pane = document.querySelector('.mdpm-ac') as HTMLElement
    expect(pane.textContent).not.toContain('Links')
  })

  it('no press in the pane takes the caret out of the editor', async () => {
    await mount(true)
    const pane = document.querySelector('.mdpm-ac') as HTMLElement
    const back = [...pane.querySelectorAll('span')].find((n) => n.textContent === 'Links')
    for (const target of [pane, back]) {
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      target?.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(true)
    }
  })
})

describe('connectionAt is the one answer to which connection holds an offset', () => {
  const scan = scanDoc('see [[Q3 Plan|the plan]] and [[Other]] end')

  it('finds the connection an offset sits in, at either bracket edge', () => {
    expect(connectionAt(scan, 4)?.full).toEqual([4, 24])
    expect(connectionAt(scan, 24)?.full).toEqual([4, 24])
    expect(connectionAt(scan, 30)?.full).toEqual([29, 38])
    expect(connectionAt(scan, 26)).toBeNull()
  })

  it('reads spans relative to the offset’s own line', () => {
    expect(connectionAt(scanDoc('intro\n[[Alpha]]'), 8)?.full).toEqual([0, 9])
  })

  it('the alias demands the caret be in the alias itself', () => {
    expect(inAliasAt(scan, 6)).toBe(false)
    expect(inAliasAt(scan, 16)).toBe(true)
  })

  it('an opened-but-empty alias keeps its zero-width slot', () => {
    expect(connectionAt(scanDoc('a [[Alpha|]] b'), 10)?.alias).toEqual([10, 10])
    expect(connectionAt(scanDoc('a [[Alpha|x]] b'), 10)?.alias).toEqual([10, 11])
    expect(connectionAt(scanDoc('a [[Alpha]] b'), 5)?.alias).toBeNull()
  })

  it('a connection code touches is text, as the editor draws it', () => {
    expect(connectionAt(scanDoc('x `[[A`]] y'), 7)).toBeNull()
    expect(connectionAt(scanDoc('```\n[[A]]\n```'), 6)).toBeNull()
    expect(inAliasAt(scanDoc('x `[[A|b`]] y'), 9)).toBe(false)
  })
})
