// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, stubPointerCapture, stubRect } from '@pommora/uix/Interactions/pointerHarness'
import { MarkdownTable } from './MarkdownTable'
import { testHost } from '../editorHarness'
import type { TableModel } from '../Engine/Tables/model'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
stubPointerCapture()

const roCallbacks: ResizeObserverCallback[] = []
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
    roCallbacks.push(cb)
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
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
        host: testHost(),
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
  roCallbacks.length = 0
})

const bodyCell = (): HTMLElement =>
  container.querySelectorAll<HTMLElement>('.mdpm-tbl-cell-static')[1]

const editing = (): boolean => container.querySelector('.mdpm-tbl-cell-editor') !== null

async function sweepInto(from: Node, cell: HTMLElement): Promise<void> {
  const sel = window.getSelection()!
  sel.removeAllRanges()
  // setBaseAndExtent, not a Range: a sweep upward is anchored after its focus, and a Range collapses when its start is set past its end.
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

describe('a swept cell rectangle', () => {
  const selectedCells = (): number => container.querySelectorAll('.mdpm-tbl-selected').length

  const stubGeometry = (): void => {
    stubRect(container.querySelector('.mdpm-tbl-wrap') as HTMLElement, {
      top: 0,
      bottom: 48,
      left: 0,
      right: 100,
    })
    const table = container.querySelector('table.mdpm-tbl') as HTMLTableElement
    const rows = [...(table.tHead?.rows ?? []), ...(table.tBodies[0]?.rows ?? [])]
    for (const [i, r] of rows.entries()) stubRect(r, { top: i * 24, bottom: (i + 1) * 24 })
    for (const c of table.tHead?.rows[0]?.cells ?? [])
      stubRect(c, { top: 0, bottom: 24, left: 0, right: 100 })
  }

  const sweepDown = async (): Promise<void> => {
    stubGeometry()
    await act(async () => {
      for (const cb of roCallbacks) cb([], {} as ResizeObserver)
    })
    const header = container.querySelectorAll<HTMLElement>('.mdpm-tbl-cell-static')[0]
    await act(async () => firePointer(header, 'pointerdown', { x: 10, y: 10 }))
    await act(async () => firePointer(window, 'pointermove', { x: 10, y: 20 }))
    await act(async () => firePointer(window, 'pointermove', { x: 10, y: 40 }))
    await act(async () => firePointer(window, 'pointerup'))
  }

  it('clears on Escape', async () => {
    await mount()
    await sweepDown()
    expect(selectedCells()).toBe(2)
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })
    expect(selectedCells()).toBe(0)
  })
})
