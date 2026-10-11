// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MarkdownTable } from './MarkdownTable'
import type { TableModel } from '../Engine/Tables/model'
import { cellToSource } from '../Engine/Tables/codec'
import { EditorView } from '@codemirror/view'
import { undo, undoDepth } from '@codemirror/commands'
import type { LinkAction } from '../../Actions/connectionMenu'
import type { ConnectionsApi, LinkMenuTarget } from '../Links/connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  settleTitle,
  stubEditorBridge,
  tableStubs,
  testHost,
} from '../../Testing/editorHarness'
import { pushDismissal } from '@pommora/uix/Interactions/dismissalStack'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Quarterly Plan', path: 'N/Quarterly Plan.md' }]),
  location: () => [],
  open: () => {},
  headingsOf: (path) =>
    path === 'N/Quarterly Plan.md'
      ? { keys: ['setup'], texts: ['Setup'], outline: [{ text: 'Setup', level: 2 }] }
      : undefined,
}

const model: TableModel = {
  columns: [{ align: null, dashes: 3 }],
  header: ['A'],
  rows: [['[[Quarterly Plan|the plan]]']],
}

const props = { ...tableStubs, host: { ...testHost(), connections: () => conn }, model }

let container: HTMLDivElement
let root: Root

async function mount(): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root.render(createElement(MarkdownTable, props)))
}

afterEach(async () => {
  if (!container?.isConnected) return
  await act(async () => root.unmount())
  container.remove()
})

describe('a connection in a resting cell behaves like one in the body', () => {
  it('renders the alias, resolved by its title', async () => {
    await mount()
    const link = container.querySelector('.md-connection-resolved') as HTMLElement
    expect(link.textContent).toBe('the plan')
  })

  it('and a press on the cell beside the link still opens the editor', async () => {
    await mount()
    const cell = container.querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
    await act(async () => {
      cell.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
      )
      cell.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
      )
      cell.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }),
      )
    })
    expect(container.querySelectorAll('.cm-editor').length).toBeGreaterThan(0)
  })
})

describe('a heading link in a resting cell renders its three parts', () => {
  const headingModel: TableModel = {
    columns: [{ align: null, dashes: 3 }],
    header: ['A'],
    rows: [['[[Quarterly Plan#Setup]]']],
  }

  async function mountHeading(): Promise<void> {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () =>
      root.render(createElement(MarkdownTable, { ...props, model: headingModel })),
    )
  }

  it('renders the page, the heading symbol, and the heading text', async () => {
    await mountHeading()
    const link = container.querySelector('.md-connection-resolved') as HTMLElement
    expect(link.textContent).toBe('Quarterly Plan§Setup')
  })
})

describe('the picker survives being clicked', () => {
  it('a pointerdown inside the panel does not demote the cell', async () => {
    await mount()
    const cell = container.querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
    await act(async () => {
      cell.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
      )
      cell.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
      )
      cell.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }),
      )
    })
    expect(container.querySelectorAll('.cm-editor').length).toBeGreaterThan(0)

    const panel = document.createElement('div')
    panel.className = 'mdpm-ac'
    document.body.appendChild(panel)
    const shield = pushDismissal({ layer: () => panel })
    await act(async () => {
      panel.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
      )
    })
    shield.release()
    expect(container.querySelectorAll('.cm-editor').length).toBeGreaterThan(0)
    panel.remove()
  })

  it('but a pointerdown genuinely outside still does', async () => {
    await mount()
    const cell = container.querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
    await act(async () => {
      cell.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
      )
      cell.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
      )
      cell.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }),
      )
    })
    await act(async () => {
      document.body.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
      )
    })
    expect(container.querySelectorAll('.cm-editor')).toHaveLength(0)
  })
})

describe('a link’s menu in a resting cell', () => {
  const URL = 'https://a.com'
  const table = (cell: string): string => `| A |\n| --- |\n| ${cellToSource(cell)} |`
  let popped: LinkMenuTarget | null = null
  let answer: (action: LinkAction | null) => void = () => {}

  const menuConn: ConnectionsApi = {
    ...buildPageIndex([
      { id: 'p1', title: 'Quarterly Plan', path: 'N/Quarterly Plan.md' },
      { id: 'p2', title: 'Roadmap', path: 'N/Roadmap.md' },
    ]),
    location: () => [],
    open: () => {},
    headingsOf: () => undefined,
    menu: (t) => {
      popped = t
      return new Promise((r) => {
        answer = r
      })
    },
  }

  async function restingCell(): Promise<HTMLElement> {
    let el = editorContainer().querySelector('tbody .mdpm-tbl-cell-static [data-link]')
    for (let i = 0; !el && i < 50; i++) {
      await act(() => new Promise((r) => setTimeout(r, 20)))
      el = editorContainer().querySelector('tbody .mdpm-tbl-cell-static [data-link]')
    }
    if (!el) throw new Error('the resting link never rendered')
    return el as HTMLElement
  }

  async function open(cell: string, readOnly = false): Promise<EditorView> {
    stubEditorBridge()
    popped = null
    const view = await mountEditor({ initialBody: table(cell), connections: menuConn, readOnly })
    const link = await restingCell()
    await act(async () => {
      link.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 }),
      )
      link.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
    return view
  }

  const pick = (action: LinkAction | null): Promise<void> =>
    act(async () => {
      answer(action)
      await new Promise((r) => setTimeout(r, 0))
    })

  const liveCell = (): EditorView | null => {
    const dom = editorContainer().querySelector('.mdpm-tbl-cell-editor .cm-content')
    return dom && EditorView.findFromDOM(dom as HTMLElement)
  }

  const liveSelection = (): string | null => {
    const cell = liveCell()
    const sel = cell?.state.selection.main
    return cell && sel ? cell.state.sliceDoc(sel.from, sel.to) : null
  }

  afterEach(cleanupEditor)

  it('Remove Link commits the shown text without entering', async () => {
    const view = await open('[[Quarterly Plan|the plan]]')
    await pick('link:remove')
    expect(view.state.doc.toString()).toBe(table('the plan'))
    expect(liveCell()).toBeNull()
    expect(editorContainer().querySelector('tbody .mdpm-tbl-cell-static')?.textContent).toBe(
      'the plan',
    )
  })

  it('Rename on a bare connection commits an open alias and enters with the caret after the pipe', async () => {
    const view = await open('[[Quarterly Plan]]')
    await pick('rename')
    expect(view.state.doc.toString()).toBe(table('[[Quarterly Plan|]]'))
    expect(liveCell()?.state.doc.toString()).toBe('[[Quarterly Plan|]]')
    expect(liveCell()?.state.selection.main.head).toBe(17)
  })

  it('Edit Title enters with the title selected and writes nothing', async () => {
    const view = await open('[[Quarterly Plan|the plan]]')
    await pick('editLink')
    expect(view.state.doc.toString()).toBe(table('[[Quarterly Plan|the plan]]'))
    expect(liveSelection()).toBe('Quarterly Plan')
  })

  it('Page Title keeps the cell as it was until the title lands, then commits the titled form once', async () => {
    const view = await open(`[x](${URL})`)
    await pick('format:link-title')
    expect(view.state.doc.toString()).toBe(table(`[x](${URL})`))
    await settleTitle(URL, 'A Site')
    expect(view.state.doc.toString()).toBe(table(`[A Site](${URL})`))
    await act(async () => {
      undo(view)
    })
    expect(view.state.doc.toString()).toBe(table(`[x](${URL})`))
    expect(liveCell()).toBeNull()
  })

  it('Page Title commits the short form once when the title fails', async () => {
    const view = await open(`[x](${URL})`)
    await pick('format:link-title')
    await settleTitle(URL, null)
    expect(view.state.doc.toString()).toBe(table(`[a.com](${URL})`))
    await act(async () => {
      undo(view)
    })
    expect(view.state.doc.toString()).toBe(table(`[x](${URL})`))
  })

  it('Page Title leaves what was typed in the cell while its title was pending', async () => {
    const view = await open(`[x](${URL})`)
    await pick('format:link-title')
    const cell = editorContainer().querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
    await act(async () => {
      cell.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }),
      )
    })
    await act(async () => {
      liveCell()?.dispatch({ changes: { from: 0, insert: 'y ' }, userEvent: 'input.type' })
    })
    expect(view.state.doc.toString()).toBe(table(`y [x](${URL})`))
    await settleTitle(URL, 'A Site')
    expect(view.state.doc.toString()).toBe(table(`y [x](${URL})`))
    expect(liveCell()?.state.doc.toString()).toBe(`y [x](${URL})`)
  })

  it('a markdown link naming a page authors as a connection does', async () => {
    await open('[x](Roadmap)')
    expect(popped).toMatchObject({ kind: 'page', editable: true })
    await pick('editLink')
    expect(liveSelection()).toBe('Roadmap')
  })

  it.each([
    'link:delete',
    'editLink',
  ] as const)('declines %s once the cell was edited while its menu stood open', async (action) => {
    const view = await open(`[x](${URL})`)
    const at = view.state.doc.toString().indexOf('[x]')
    await act(async () => {
      view.dispatch({ changes: { from: at, insert: 'y ' } })
    })
    await pick(action)
    expect(view.state.doc.toString()).toBe(table(`y [x](${URL})`))
    expect(liveCell()).toBeNull()
  })

  it('a format that leaves the text as it was commits nothing', async () => {
    const view = await open(`[a.com](${URL})`)
    await pick('format:link-short')
    expect(undoDepth(view.state)).toBe(0)
  })

  it('a read-only cell offers no authoring rows', async () => {
    await open('[[Quarterly Plan]]', true)
    expect(popped).toMatchObject({ kind: 'page', editable: false })
  })
})
