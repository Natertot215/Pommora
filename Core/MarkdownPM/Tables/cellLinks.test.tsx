// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MarkdownTable } from './MarkdownTable'
import { testHost } from '../editorHarness'
import type { TableModel } from '../Engine/Tables/model'
import { EditorView } from '@codemirror/view'
import type { ConnUrlAction } from '@pommora/core/Actions/connectionMenu'
import {
  buildPageIndex,
  type ConnectionsApi,
  type ConnMenuTarget,
  type ConnPage,
} from '../Links/connectionsApi'
import { stubDialer } from '../../vitest.setup'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const opened = vi.fn()
const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Quarterly Plan', path: 'N/Quarterly Plan.md' }]),
  open: (p: ConnPage) => opened(p.id),
}

const model: TableModel = {
  columns: [{ align: null, dashes: 3 }],
  header: ['A'],
  rows: [['[[Quarterly Plan|the plan]]']],
}

const noop = (): void => {}
const props = {
  host: testHost(),
  model,
  connections: () => conn,
  onCellCommit: noop,
  onExit: noop,
  onReorder: () => false,
  onResize: () => false,
  onMenu: noop,
  onTableDrag: noop,
  onUndo: noop,
  onRedo: noop,
  onAppend: noop,
}

let container: HTMLDivElement
let root: Root

async function mount(): Promise<void> {
  opened.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root.render(createElement(MarkdownTable, props)))
}

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function clickLink(): Promise<HTMLElement> {
  const link = container.querySelector('.md-connection-resolved') as HTMLElement
  await act(async () => {
    link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    link.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
    link.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }),
    )
  })
  return link
}

describe('a connection in a resting cell behaves like one in the body', () => {
  it('renders the alias, and carries the title it resolves by', async () => {
    await mount()
    const link = container.querySelector('.md-connection-resolved') as HTMLElement
    expect(link.textContent).toBe('the plan')
    expect(link.dataset.connTitle).toBe('Quarterly Plan')
  })

  it('navigates rather than dropping the caret into its syntax', async () => {
    await mount()
    await clickLink()
    expect(opened).toHaveBeenCalledWith('p1')
    expect(container.querySelectorAll('.cm-editor')).toHaveLength(0)
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
    expect(opened).not.toHaveBeenCalled()
    expect(container.querySelectorAll('.cm-editor').length).toBeGreaterThan(0)
  })
})

describe('an external link in a resting cell behaves like one in the body', () => {
  const opener = vi.fn()
  const web: TableModel = {
    columns: [{ align: null, dashes: 3 }],
    header: ['A'],
    rows: [['[Home](https://x.test)']],
  }

  async function mountWeb(): Promise<void> {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'link:open': opener,
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(createElement(MarkdownTable, { ...props, model: web })))
  }

  it('follows to the system browser on a click', async () => {
    opener.mockReset()
    await mountWeb()
    const link = container.querySelector('.md-link') as HTMLElement
    await act(async () => {
      link.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
      )
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }),
      )
    })
    expect(opener).toHaveBeenCalledWith('https://x.test')
    expect(container.querySelectorAll('.cm-editor')).toHaveLength(0)
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
    await act(async () => {
      panel.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
      )
    })
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
  const URL = 'https://www.example.com/a/b'
  const committed = vi.fn()
  const settled = vi.fn()

  async function mountLink(action: ConnUrlAction): Promise<void> {
    committed.mockReset()
    settled.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const linked: ConnectionsApi = {
      ...conn,
      menu: (t) => {
        if (t.kind === 'url') t.apply?.(action)
      },
    }
    await act(async () =>
      root.render(
        createElement(MarkdownTable, {
          ...props,
          model: { ...model, rows: [[`a [Home](${URL}) b`]] },
          connections: () => linked,
          onCellCommit: (_r: number, _c: number, text: string) => committed(text),
          onSettled: settled,
        }),
      ),
    )
  }

  const rightClick = async (): Promise<void> => {
    const link = container.querySelector('.md-link') as HTMLElement
    await act(async () => {
      link.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 }),
      )
      link.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
  }

  it('rewrites the cell in place, without entering it', async () => {
    await mountLink('format:link-short')
    await rightClick()
    expect(committed).toHaveBeenCalledWith(`a [example.com](${URL}) b`)
    expect(container.querySelectorAll('.cm-editor')).toHaveLength(0)
  })

  it('settles the table, so the edit is drawn rather than waiting on a visit', async () => {
    await mountLink('link:delete')
    await rightClick()
    expect(settled).toHaveBeenCalled()
  })

  it('declines once the cell no longer holds the link the menu was popped on', async () => {
    committed.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    let popped: ConnMenuTarget | null = null
    const linked: ConnectionsApi = {
      ...conn,
      menu: (t) => {
        popped = t
      },
    }
    const render = (rows: string[][]): Promise<void> =>
      act(async () =>
        root.render(
          createElement(MarkdownTable, {
            ...props,
            model: { ...model, rows },
            connections: () => linked,
            onCellCommit: (_r: number, _c: number, text: string) => committed(text),
          }),
        ),
      )
    await render([[`a [Home](${URL}) b`]])
    const link = container.querySelector('.md-link') as HTMLElement
    await act(async () => {
      link.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
    await render([['something else entirely']])
    const target = popped as ConnMenuTarget | null
    if (target?.kind === 'url') await act(async () => target.apply?.('link:delete'))
    expect(committed).not.toHaveBeenCalled()
  })

  it('leaves the label as prose on Remove Link', async () => {
    await mountLink('link:remove')
    await rightClick()
    expect(committed).toHaveBeenCalledWith('a Home b')
  })

  it('takes the whole link on Delete', async () => {
    await mountLink('link:delete')
    await rightClick()
    expect(committed).toHaveBeenCalledWith('a  b')
  })

  it('enters the cell with the label selected on Rename', async () => {
    await mountLink('rename')
    await rightClick()
    expect(committed).not.toHaveBeenCalled()
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)
    const sel = view?.state.selection.main
    expect(view && sel && view.state.sliceDoc(sel.from, sel.to)).toBe('Home')
  })

  it('enters the cell with the address selected on Edit Link', async () => {
    await mountLink('editLink')
    await rightClick()
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)
    const sel = view?.state.selection.main
    expect(view && sel && view.state.sliceDoc(sel.from, sel.to)).toBe(URL)
  })
})

describe('a connection’s menu in a resting cell', () => {
  let target: ConnMenuTarget | null = null

  async function mountConn(body: string): Promise<void> {
    target = null
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const linked: ConnectionsApi = {
      ...conn,
      menu: (t) => {
        target = t
      },
    }
    await act(async () =>
      root.render(
        createElement(MarkdownTable, {
          ...props,
          model: { ...model, rows: [[body]] },
          connections: () => linked,
        }),
      ),
    )
    const link = container.querySelector('.md-connection-resolved') as HTMLElement
    await act(async () => {
      link.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 }),
      )
      link.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
  }

  it('offers the page menu, knowing it already wears a title', async () => {
    await mountConn('[[Quarterly Plan|the plan]]')
    expect(target).toMatchObject({ kind: 'page', editable: true, hasAlias: true })
  })

  it('Rename enters the cell with the alias selected', async () => {
    await mountConn('[[Quarterly Plan|the plan]]')
    const popped = target as ConnMenuTarget | null
    if (popped?.kind === 'page') await act(async () => popped.apply?.('rename'))
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)
    const sel = view?.state.selection.main
    expect(view && sel && view.state.sliceDoc(sel.from, sel.to)).toBe('the plan')
  })

  it('a markdown link naming a page gets the page menu without the authoring pair', async () => {
    await mountConn('[the plan](Quarterly%20Plan)')
    expect(target).toMatchObject({ kind: 'page', editable: false, hasAlias: false })
  })
})
