// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TableView } from './TableView'
import type { TableModel } from './model'
import { EditorView } from '@codemirror/view'
import type { ConnUrlAction } from '@shared/connections'
import {
  buildPageIndex,
  type ConnectionsApi,
  type ConnMenuTarget,
  type ConnPage,
} from '../connections'

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

// The cell holds an ALIASED connection, so what it draws is "the plan" and what it resolves is
// "Quarterly Plan" — the case where reading the key off the rendered text would fail.
const model: TableModel = {
  columns: [{ align: null, dashes: 3 }],
  header: ['A'],
  rows: [['[[Quarterly Plan|the plan]]']],
}

const noop = (): void => {}
const props = {
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
  await act(async () => root.render(createElement(TableView, props)))
}

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

/** A real click on the link: pointerdown (the click-away listener watches this), then the mousedown
 *  StaticCell activates on, then the click. */
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

  // Without claiming the press the cell swaps itself into an editor first, and the click lands on a
  // caret inside the syntax instead of navigating.
  it('navigates rather than dropping the caret into its syntax', async () => {
    await mount()
    await clickLink()
    expect(opened).toHaveBeenCalledWith('p1')
    // And the cell never swapped into its editor on the way.
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
    })
    expect(opened).not.toHaveBeenCalled()
    expect(container.querySelectorAll('.cm-editor').length).toBeGreaterThan(0)
  })
})

// The autocomplete panel is a body-level portal — outside the table by DOM, inside it by intent.
// Demoting the active cell on a pointerdown there tears the editor down before the press that picked
// a suggestion can reach it, and the typed characters are left dangling.
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
    })
    await act(async () => {
      document.body.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
      )
    })
    expect(container.querySelectorAll('.cm-editor')).toHaveLength(0)
  })
})

// A link carries its own menu wherever it is drawn, and a resting cell draws links — so the four
// actions that only rewrite text must reach it without the cell first becoming an editor.
describe('a link’s menu in a resting cell', () => {
  const URL = 'https://www.example.com/a/b'
  const committed = vi.fn()
  const settled = vi.fn()

  /** Mount a table holding one external link, with the menu already resolving to `action`. */
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
        createElement(TableView, {
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

  // Settling is what a demoting cell editor does, and a resting cell never had one to demote —
  // without it the widget keeps drawing the pre-edit text until something else enters and leaves.
  it('settles the table, so the edit is drawn rather than waiting on a visit', async () => {
    await mountLink('link:delete')
    await rightClick()
    expect(settled).toHaveBeenCalled()
  })

  // A native menu can be held open for as long as the user likes, and an undo or an outside write can
  // move the cell underneath it — the same window the editor's own applier guards against.
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
          createElement(TableView, {
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
    // The cell changes while the menu stands open.
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

  // The two that put you in position to retype are the two that have to enter the cell.
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

// One decision about what a right-clicked link is offered, whichever syntax wrote it: the connection
// gets the page menu it gets in the body, and its authoring pair enters the cell the same way.
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
        createElement(TableView, {
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

  // A markdown link naming a page is menued as the connection it is drawn as, minus the authoring
  // pair that belongs to `[[ ]]` — the same subset the body offers it.
  it('a markdown link naming a page gets the page menu without the authoring pair', async () => {
    await mountConn('[the plan](Quarterly%20Plan)')
    expect(target).toMatchObject({ kind: 'page', editable: false, hasAlias: false })
  })
})
