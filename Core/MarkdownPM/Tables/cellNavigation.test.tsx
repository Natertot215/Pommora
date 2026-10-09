// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { MarkdownTable } from './MarkdownTable'
import { tableStubs, testHost } from '../../Testing/editorHarness'
import type { TableModel } from '../Engine/Tables/model'

// jsdom lacks ResizeObserver (MarkdownTable measures cell geometry with it); a no-op stub is enough. The flag enables React's act() in this env.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const model: TableModel = {
  columns: [
    { align: null, dashes: 3 },
    { align: null, dashes: 3 },
  ],
  header: ['A', 'B'],
  rows: [
    ['c1', 'c2'],
    ['d1', 'd2'],
  ],
}

const props = { ...tableStubs, host: testHost(), model }

let container: HTMLDivElement
let root: Root

async function mount(overrides: Partial<typeof props> = {}): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(MarkdownTable, { ...props, ...overrides }))
  })
}

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

function cellEl(row: number, col: number): HTMLElement {
  const table = container.querySelector('table.mdpm-tbl')!
  if (row === 0) return table.querySelector('thead tr')!.children[col] as HTMLElement
  const tr = table.querySelector('tbody')!.children[row - 1] as HTMLElement
  return tr.children[col] as HTMLElement
}

async function clickCell(row: number, col: number): Promise<void> {
  const div = cellEl(row, col).querySelector('.mdpm-tbl-cell-static') as HTMLElement
  const at = { bubbles: true, cancelable: true, button: 0, clientX: 4, clientY: 4 }
  await act(async () => {
    div.dispatchEvent(new MouseEvent('pointerdown', at))
    div.dispatchEvent(new MouseEvent('mousedown', at))
    div.dispatchEvent(new MouseEvent('click', { ...at, detail: 1 }))
  })
}

const editors = (): NodeListOf<Element> => container.querySelectorAll('.cm-editor')
const activeText = (): string | undefined =>
  (container.querySelector('.cm-editor.cm-focused .cm-content') as HTMLElement | null)
    ?.textContent ?? undefined
const focusInEditor = (): boolean => {
  const ed = container.querySelector('.cm-editor')
  return !!ed && !!document.activeElement && ed.contains(document.activeElement)
}

describe('table single-live-cell navigation', () => {
  it('mounts a table with ZERO editors (perf: no R×C CodeMirror instances)', async () => {
    await mount()
    expect(editors().length).toBe(0)
    expect(container.querySelectorAll('.mdpm-tbl-cell-static').length).toBe(6)
  })

  it('one click promotes a cell to the single live editor, focused', async () => {
    await mount()
    await clickCell(1, 0)
    expect(editors().length).toBe(1)
    expect(focusInEditor()).toBe(true)
    expect(activeText()).toBe('c1')
  })

  it('clicking a DIFFERENT cell moves the editor in ONE click and keeps it focused', async () => {
    await mount()
    await clickCell(1, 0)
    expect(activeText()).toBe('c1')
    await clickCell(1, 1)
    expect(editors().length).toBe(1)
    expect(focusInEditor()).toBe(true)
    expect(activeText()).toBe('c2')
  })

  it('leaves the press alone, so a selection can be dragged out of the cell', async () => {
    await mount()
    const div = cellEl(1, 0).querySelector('.mdpm-tbl-cell-static') as HTMLElement
    const ev = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: 4,
      clientY: 4,
    })
    await act(async () => {
      div.dispatchEvent(ev)
    })
    expect(ev.defaultPrevented).toBe(false)
    expect(editors().length).toBe(0)
  })

  it('clicking outside the table demotes the active cell back to static', async () => {
    await mount()
    await clickCell(1, 0)
    expect(editors().length).toBe(1)
    await act(async () => {
      document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }))
    })
    expect(editors().length).toBe(0)
  })
})

describe('a live cell under a menu’s native Undo and Redo', () => {
  it('forwards each to the page history', async () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    await mount({ onUndo, onRedo })
    await clickCell(1, 0)
    const content = container.querySelector('.cm-editor .cm-content')!
    for (const inputType of ['historyUndo', 'historyRedo'])
      content.dispatchEvent(
        new InputEvent('beforeinput', { inputType, bubbles: true, cancelable: true }),
      )
    expect(onUndo).toHaveBeenCalledOnce()
    expect(onRedo).toHaveBeenCalledOnce()
  })
})

describe('text landing in a live cell from elsewhere', () => {
  const grown: TableModel = { ...model, rows: [['c1 and more', 'c2'], model.rows[1]] }
  const land = async (onCellCommit = vi.fn()): Promise<EditorView> => {
    await mount({ onCellCommit })
    await clickCell(1, 0)
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)!
    // jsdom lays nothing out, so a focused view reads its selection back as 0 after any redraw.
    await act(async () => {
      view.dispatch({ selection: { anchor: 1 } })
      view.contentDOM.blur()
    })
    await act(async () => {
      root.render(createElement(MarkdownTable, { ...props, onCellCommit, model: grown }))
    })
    return view
  }

  it('keeps a mid-cell caret where it stood', async () => {
    const view = await land()
    expect(view.state.doc.toString()).toBe('c1 and more')
    expect(view.state.selection.main.head).toBe(1)
  })

  it('and never commits the landing back into the page', async () => {
    const onCellCommit = vi.fn()
    await land(onCellCommit)
    expect(onCellCommit).not.toHaveBeenCalled()
  })
})
