// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, pressEscape, stubPointerCapture } from '@renderer/Testing/pointerHarness'
import { getTile, tileIds } from './Core/model'
import { insertBand } from './Core/ops'
import { TileGrid } from './TileGrid'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    disconnect(): void {}
  },
)

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const layout = insertBand(insertBand({ bands: [] }, 0, 'a', 200), 1, 'b', 100)

function mount(): { onLayoutChange: ReturnType<typeof vi.fn>; edge: HTMLElement } {
  const onLayoutChange = vi.fn()
  act(() =>
    root.render(
      <TileGrid
        layout={layout}
        onLayoutChange={onLayoutChange}
        renderTile={(id) => <span data-tile={id} />}
      />,
    ),
  )
  return { onLayoutChange, edge: host.querySelector('.resize-edge-s') as HTMLElement }
}

const tileEl = (id: string): HTMLElement =>
  [...host.querySelectorAll<HTMLElement>('.tile')].find((t) =>
    t.querySelector(`[data-tile="${id}"]`),
  ) as HTMLElement

const settled = (id: string): void =>
  act(() => {
    const e = new Event('transitionend', { bubbles: true })
    Object.defineProperty(e, 'propertyName', { value: 'transform' })
    tileEl(id).dispatchEvent(e)
  })

describe('the grid on the gesture engine', () => {
  it('a south-edge drag released on the window commits the stretched height once', () => {
    const { onLayoutChange, edge } = mount()
    act(() => firePointer(edge, 'pointerdown', { x: 0, y: 0 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 30 }))
    act(() => firePointer(window, 'pointerup'))
    expect(onLayoutChange).toHaveBeenCalledOnce()
    expect(getTile(onLayoutChange.mock.calls[0][0], 'a')?.h).toBe(230)
  })

  it('Escape mid-drag commits nothing; a press that never moved commits nothing', () => {
    const { onLayoutChange, edge } = mount()
    act(() => firePointer(edge, 'pointerdown', { x: 0, y: 0 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 30 }))
    act(() => pressEscape())
    act(() => firePointer(edge, 'pointerdown', { x: 0, y: 0 }))
    act(() => firePointer(window, 'pointerup'))
    expect(onLayoutChange).not.toHaveBeenCalled()
    act(() => firePointer(edge, 'pointerdown', { x: 0, y: 0 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 30 }))
    act(() => firePointer(window, 'pointerup'))
    expect(onLayoutChange).toHaveBeenCalledOnce()
  })

  it('a handle drag onto the top seam lifts, settles, and commits the move once', () => {
    const { onLayoutChange } = mount()
    const handle = tileEl('b').querySelector('.tile-handle') as HTMLElement
    act(() => firePointer(handle, 'pointerdown', { x: 0, y: 210 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 5 }))
    expect(tileEl('b').classList.contains('is-lifted')).toBe(true)
    act(() => firePointer(window, 'pointerup'))
    expect(onLayoutChange).not.toHaveBeenCalled()
    settled('b')
    expect(onLayoutChange).toHaveBeenCalledOnce()
    expect(tileIds(onLayoutChange.mock.calls[0][0])).toEqual(['b', 'a'])
  })

  it('Escape during a handle drag settles home and commits nothing', () => {
    const { onLayoutChange } = mount()
    const handle = tileEl('b').querySelector('.tile-handle') as HTMLElement
    act(() => firePointer(handle, 'pointerdown', { x: 0, y: 210 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 5 }))
    act(() => pressEscape())
    expect(tileEl('b').classList.contains('is-lifted')).toBe(true)
    settled('b')
    expect(tileEl('b').classList.contains('is-lifted')).toBe(false)
    expect(onLayoutChange).not.toHaveBeenCalled()
  })
})
