// @vitest-environment jsdom
// The drag's slot math is wrap-relative while the pointer is viewport-relative — these pin the
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

async function mount(
  onReorder: (axis: 'col' | 'row', from: number, to: number) => boolean,
): Promise<void> {
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
}

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

// Grip index 1 is the first data row — index 0 drags the whole table.
const measureAndGrip = async (): Promise<HTMLElement> => {
  await act(async () => {
    for (const cb of roCallbacks) cb([], {} as ResizeObserver)
  })
  return container.querySelectorAll('.mdpm-tbl-grip-row')[1] as HTMLElement
}

// The editor scroll moves the wrap's viewport box; wrap-relative geom holds still.
const scrollWrapTo = async (wrapTop: number): Promise<void> => {
  stubGeometry(wrapTop)
  await act(async () => {
    container.dispatchEvent(new Event('scroll', { bubbles: false }))
  })
}

describe('GFM table drag under an editor scroll', () => {
  it('re-bases its origin, so the slot follows the moved table', async () => {
    const onReorder = vi.fn(() => false)
    await mount(onReorder)
    stubGeometry(0)
    const grip = await measureAndGrip()
    await act(async () => {
      firePointer(grip, 'pointerdown', { x: 210, y: 30 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 210, y: 36 })
    })
    await scrollWrapTo(-24)
    await act(async () => {
      firePointer(window, 'pointermove', { x: 210, y: 36 })
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    expect(onReorder).toHaveBeenCalledExactlyOnceWith('row', 1, 2)
  })

  it('a scroll with the pointer held still re-resolves, so a release without moving commits fresh', async () => {
    const onReorder = vi.fn(() => false)
    await mount(onReorder)
    stubGeometry(0)
    const grip = await measureAndGrip()
    await act(async () => {
      firePointer(grip, 'pointerdown', { x: 210, y: 30 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 210, y: 36 })
    })
    await scrollWrapTo(-24)
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    expect(onReorder).toHaveBeenCalledExactlyOnceWith('row', 1, 2)
  })
})
