// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, stubPointerCapture } from '../Testing/pointerHarness'
import { nudgeDragRemeasure } from './dragDisclose'
import { useInsertionDrag } from './insertionDrag'
import type { Escort } from './engine'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

let loose = false
const escort: Escort = {
  lift: () => true,
  move: () => {},
  drop: () => {
    loose = false
    return false
  },
  abort: () => {},
  loose: () => loose,
}

const take = vi.fn((): object | null => ({}))
const commit = vi.fn()

function List({ watch }: { watch: number }): React.JSX.Element {
  const drag = useInsertionDrag<number, object>({
    take,
    resolve: (_id, point) => Math.round(point.y),
    commit: (id, slot) => commit(id, slot),
    lineFor: () => ({ top: 0 }),
    label: () => 'row',
    ghost: 'none',
    escort,
    escortSpec: (id, rect) => ({ id, family: 'tabs', item: id, rect, home: rect }),
    rowEl: () => document.querySelector<HTMLElement>('[data-row]'),
    scrollTarget: () => null,
    disclose: true,
    watch,
  })
  return (
    <div className="drop-line-host">
      <div data-row onPointerDown={(e) => drag.begin('a', e)} />
      {drag.line}
    </div>
  )
}

let host: HTMLDivElement
let root: Root
let frames: FrameRequestCallback[]

const render = (watch: number): Promise<void> =>
  act(async () => {
    root.render(<List watch={watch} />)
  })

const flushFrame = (): void => {
  const due = frames
  frames = []
  for (const f of due) f(0)
}

const lift = async (): Promise<void> => {
  await act(async () => {
    firePointer(host.querySelector('[data-row]') as HTMLElement, 'pointerdown', { x: 4, y: 4 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 4, y: 40 })
  })
}

const line = (): Element | null => host.querySelector('.drop-line')

beforeEach(async () => {
  loose = false
  take.mockClear()
  commit.mockClear()
  frames = []
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f))
  vi.stubGlobal('cancelAnimationFrame', () => {})
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await render(0)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe('useInsertionDrag', () => {
  it('takes the snapshot once per drag and retakes it after the list changes', async () => {
    await lift()
    await act(async () => {
      firePointer(window, 'pointermove', { x: 4, y: 50 })
    })
    expect(take).toHaveBeenCalledOnce()
    await render(1)
    expect(take).toHaveBeenCalledTimes(2)
    await act(async () => {
      firePointer(window, 'pointerup', { x: 4, y: 50 })
    })
    expect(commit).toHaveBeenCalledWith('a', 50)
  })

  it('never keeps a missing measurement, so the next resolve measures again', async () => {
    take.mockReturnValueOnce(null)
    await lift()
    expect(take).toHaveBeenCalledTimes(2)
    expect(line()).not.toBeNull()
    await act(async () => {
      firePointer(window, 'pointerup', { x: 4, y: 40 })
    })
    expect(commit).toHaveBeenCalledWith('a', 40)
  })

  it('draws no line once the item goes loose', async () => {
    await lift()
    expect(line()).not.toBeNull()
    loose = true
    await act(async () => {
      firePointer(window, 'pointermove', { x: 4, y: 60 })
    })
    expect(line()).toBeNull()
  })

  it('moves nothing when a loose release follows a spring-open without another move', async () => {
    await lift()
    loose = true
    await act(async () => {
      firePointer(window, 'pointermove', { x: 4, y: 60 })
    })
    await act(async () => {
      nudgeDragRemeasure()
      flushFrame()
    })
    await act(async () => {
      firePointer(window, 'pointerup', { x: 4, y: 60 })
    })
    expect(commit).not.toHaveBeenCalled()
  })

  it('still commits against the fresh slot after a spring-open while the item is home', async () => {
    await lift()
    await act(async () => {
      nudgeDragRemeasure()
      flushFrame()
    })
    await act(async () => {
      firePointer(window, 'pointerup', { x: 4, y: 40 })
    })
    expect(commit).toHaveBeenCalledWith('a', 40)
  })
})
