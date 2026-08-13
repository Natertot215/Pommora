// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TableView } from './TableView'
import type { TableModel } from './model'
import { buildPageIndex, type ConnectionsApi, type ConnPage } from '../connections'

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
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }))
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
      cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
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
      cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
    })
    expect(container.querySelectorAll('.cm-editor').length).toBeGreaterThan(0)

    const panel = document.createElement('div')
    panel.className = 'mdpm-ac'
    document.body.appendChild(panel)
    await act(async () => {
      panel.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
    })
    expect(container.querySelectorAll('.cm-editor').length).toBeGreaterThan(0)
    panel.remove()
  })

  it('but a pointerdown genuinely outside still does', async () => {
    await mount()
    const cell = container.querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
    })
    await act(async () => {
      document.body.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
      )
    })
    expect(container.querySelectorAll('.cm-editor')).toHaveLength(0)
  })
})
