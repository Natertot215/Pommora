// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, pressEscape, stubPointerCapture } from '@renderer/Testing/pointerHarness'
import { getTile } from './Core/model'
import { insertBand } from './Core/ops'
import { SurfaceView } from './SurfaceView'
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

const layout = insertBand({ bands: [] }, 0, 'a', 200)

function mount(): { onLayoutChange: ReturnType<typeof vi.fn>; edge: HTMLElement } {
  const onLayoutChange = vi.fn()
  act(() =>
    root.render(
      <SurfaceView layout={layout} onLayoutChange={onLayoutChange} renderTile={() => null} />,
    ),
  )
  return { onLayoutChange, edge: host.querySelector('.resize-edge-s') as HTMLElement }
}

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
  })
})
