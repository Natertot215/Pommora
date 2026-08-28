// @vitest-environment jsdom
// State-level gesture tests over the pointer harness — geometry truth lives in the CDP pass.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, stubPointerCapture, stubRect } from '@renderer/testing/pointerHarness'
import type { Band } from '@renderer/Views/bandDndModel'
import { useGroupingListDrag, type GroupingDrop } from './groupDnd'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

// Flat property bands — no nest zones, so every slot is a clean before/after split.
const BANDS: Band[] = [
  { id: 'A', kind: 'property', depth: 0, parentId: null },
  { id: 'B', kind: 'property', depth: 0, parentId: null },
  { id: 'C', kind: 'property', depth: 0, parentId: null },
]

function List({ onDrop }: { onDrop: (id: string, drop: GroupingDrop) => void }): React.JSX.Element {
  const dnd = useGroupingListDrag({ bands: BANDS, nestable: false, onDrop })
  return (
    <div ref={dnd.containerRef} data-box>
      {BANDS.map((b) => (
        <div key={b.id} ref={dnd.rowRef(b.id)} data-row={b.id}>
          <span data-handle={b.id} {...dnd.rowHandle(b.id)} />
        </div>
      ))}
      {dnd.line && <div data-line data-y={dnd.line.y} />}
    </div>
  )
}

let host: HTMLDivElement
let root: Root
let dropSpy: ReturnType<typeof vi.fn<(id: string, drop: GroupingDrop) => void>>

const stubRows = (offset: number): void => {
  for (const [i, id] of ['A', 'B', 'C'].entries()) {
    const el = host.querySelector(`[data-row="${id}"]`)
    if (el) stubRect(el, { top: i * 24 + offset, bottom: i * 24 + 24 + offset })
  }
}

beforeEach(async () => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  dropSpy = vi.fn()
  await act(async () => {
    root.render(<List onDrop={dropSpy} />)
  })
  const box = host.querySelector('[data-box]')
  if (box) stubRect(box, { top: 0, bottom: 72 })
  stubRows(0)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const handle = (id: string): HTMLElement =>
  host.querySelector(`[data-handle="${id}"]`) as HTMLElement
const lineY = (): string | null => host.querySelector('[data-line]')?.getAttribute('data-y') ?? null

describe('grouping drag snapshot invalidation', () => {
  it('a mid-drag scroll re-measures, so the line aims at the moved rows', async () => {
    await act(async () => {
      firePointer(handle('A'), 'pointerdown', { x: 10, y: 10 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 10, y: 44 })
    })
    // Below B's midline → before C, whose top edge is 48.
    expect(lineY()).toBe('48')

    // The scroller moves the rows up by 10 while the container's own box holds still.
    stubRows(-10)
    await act(async () => {
      const box = host.querySelector('[data-box]') as HTMLElement
      box.dispatchEvent(new Event('scroll', { bubbles: false }))
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 10, y: 44 })
    })
    // Fresh rects put 44 in C's top zone → before C at its NEW top edge, 38. Stale rects say 48.
    expect(lineY()).toBe('38')
  })

  it('a scroll with the pointer held still re-aims, so a release without moving commits fresh', async () => {
    await act(async () => {
      firePointer(handle('C'), 'pointerdown', { x: 10, y: 60 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 10, y: 30 })
    })
    stubRows(24)
    await act(async () => {
      const box = host.querySelector('[data-box]') as HTMLElement
      box.dispatchEvent(new Event('scroll', { bubbles: false }))
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    expect(dropSpy).toHaveBeenCalledExactlyOnceWith('C', {
      kind: 'reorder',
      targetParentId: null,
      beforeId: 'A',
    })
  })

  it('a drop after the scroll commits against the fresh slot', async () => {
    await act(async () => {
      firePointer(handle('C'), 'pointerdown', { x: 10, y: 60 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 10, y: 30 })
    })
    stubRows(24)
    await act(async () => {
      const box = host.querySelector('[data-box]') as HTMLElement
      box.dispatchEvent(new Event('scroll', { bubbles: false }))
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 10, y: 30 })
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    // Fresh rects: 30 sits in A's top zone (24–48) → before A. Stale rects still resolve
    // before B.
    expect(dropSpy).toHaveBeenCalledExactlyOnceWith('C', {
      kind: 'reorder',
      targetParentId: null,
      beforeId: 'A',
    })
  })
})
