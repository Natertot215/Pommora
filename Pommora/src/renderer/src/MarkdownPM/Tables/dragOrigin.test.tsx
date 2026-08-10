// @vitest-environment jsdom
// The drag's slot math is wrap-relative while the pointer is viewport-relative — this pins the
// origin re-base that keeps the two aligned when the editor scrolls mid-drag.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, stubPointerCapture, stubRect } from '@renderer/testing/pointerHarness'
import { TableView } from './TableView'
import type { TableModel } from './model'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

// A ResizeObserver stub that hands the test the measure callback, so geometry can be stubbed
// after mount and then measured on demand.
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

let container: HTMLDivElement
let root: Root

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  roCallbacks.length = 0
})

const stubGeometry = (wrapTop: number): void => {
  const wrap = container.querySelector('.mdpm-tbl-wrap') as HTMLElement
  stubRect(wrap, { top: wrapTop, bottom: wrapTop + 72, left: 0, right: 200 })
  const table = container.querySelector('table.mdpm-tbl') as HTMLTableElement
  const rows = [...(table.tHead?.rows ?? []), ...(table.tBodies[0]?.rows ?? [])]
  for (const [i, r] of rows.entries()) {
    stubRect(r, { top: wrapTop + i * 24, bottom: wrapTop + (i + 1) * 24 })
  }
  const heads = Array.from(table.tHead?.rows[0]?.cells ?? [])
  for (const [i, c] of heads.entries()) {
    stubRect(c, { top: wrapTop, bottom: wrapTop + 24, left: i * 100, right: (i + 1) * 100 })
  }
}

describe('GFM table drag under an editor scroll', () => {
  it('re-bases its origin, so the slot follows the moved table', async () => {
    const onReorder = vi.fn(() => false)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(
        createElement(TableView, {
          model,
          onCellCommit: () => {},
          onExit: () => {},
          onReorder,
          onResize: () => false,
          onMenu: () => {},
          onTableDrag: () => {},
          onUndo: () => {},
          onRedo: () => {},
          onAppend: () => {},
        }),
      )
    })
    stubGeometry(0)
    await act(async () => {
      for (const cb of roCallbacks) cb([], {} as ResizeObserver)
    })

    // Grip j=1 is the first data row (j=0 drags the whole table). Rows end at 24 / 48 / 72.
    const grip = container.querySelectorAll('.mdpm-tbl-grip-row')[1] as HTMLElement
    await act(async () => {
      firePointer(grip, 'pointerdown', { x: 210, y: 30 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 210, y: 36 })
    })

    // The editor scrolls the table up by 24 — the wrap's viewport box moves, wrap-relative geom doesn't.
    stubGeometry(-24)
    await act(async () => {
      container.dispatchEvent(new Event('scroll', { bubbles: false }))
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 210, y: 36 })
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })

    // Re-based, viewport 36 is wrap-relative 60 → the slot below row 2. A stale origin reads 36 →
    // the row's own slot, a no-op drop that never calls onReorder.
    expect(onReorder).toHaveBeenCalledExactlyOnceWith('row', 1, 2)
  })
})
