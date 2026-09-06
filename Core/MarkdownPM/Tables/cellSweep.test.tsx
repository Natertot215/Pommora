// @vitest-environment jsdom
// A highlight dragged from the prose into a cell crosses a document boundary — these pin which half
// of it survives, and which direction it anchors from.
import { describe, it, expect, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MarkdownTable } from './MarkdownTable'
import type { TableModel } from './model'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const noop = (): void => {}
const model: TableModel = {
  columns: [{ align: null, dashes: 3 }],
  header: ['A'],
  rows: [['one']],
}

let container: HTMLDivElement
let root: Root
let before: HTMLParagraphElement
let after: HTMLParagraphElement

async function mount(): Promise<void> {
  before = document.createElement('p')
  before.textContent = 'prose above'
  document.body.appendChild(before)
  container = document.createElement('div')
  document.body.appendChild(container)
  after = document.createElement('p')
  after.textContent = 'prose below'
  document.body.appendChild(after)
  root = createRoot(container)
  await act(async () =>
    root.render(
      createElement(MarkdownTable, {
        model,
        onCellCommit: noop,
        onExit: noop,
        onReorder: () => false,
        onResize: () => false,
        onMenu: noop,
        onTableDrag: noop,
        onUndo: noop,
        onRedo: noop,
        onAppend: noop,
      }),
    ),
  )
}

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  before.remove()
  after.remove()
})

const bodyCell = (): HTMLElement =>
  container.querySelectorAll<HTMLElement>('.mdpm-tbl-cell-static')[1]

const editing = (): boolean => container.querySelector('.mdpm-tbl-cell-editor') !== null

/** Anchor a selection at `from` and sweep it into the cell, releasing there. */
async function sweepInto(from: Node, cell: HTMLElement): Promise<void> {
  const sel = window.getSelection()!
  sel.removeAllRanges()
  // setBaseAndExtent, not a Range: a sweep upward is anchored after its focus, and a Range collapses
  // when its start is set past its end.
  sel.setBaseAndExtent(from, 0, cell.firstChild ?? cell, 0)
  await act(async () => {
    cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }))
  })
}

describe('a selection swept in from outside the table re-seats in the cell it reached', () => {
  it('a sweep from the prose above enters the cell', async () => {
    await mount()
    await sweepInto(before.firstChild!, bodyCell())
    expect(editing()).toBe(true)
  })

  it('a sweep from the prose below enters the cell', async () => {
    await mount()
    await sweepInto(after.firstChild!, bodyCell())
    expect(editing()).toBe(true)
  })

  it('a highlight that began inside the table stands as drawn', async () => {
    await mount()
    const header = container.querySelectorAll<HTMLElement>('.mdpm-tbl-cell-static')[0]
    await sweepInto(header.firstChild ?? header, bodyCell())
    expect(editing()).toBe(false)
  })

  it('a collapsed selection is a plain click, and belongs to the click handler', async () => {
    await mount()
    const cell = bodyCell()
    window.getSelection()?.removeAllRanges()
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }))
    })
    expect(editing()).toBe(false)
  })
})
