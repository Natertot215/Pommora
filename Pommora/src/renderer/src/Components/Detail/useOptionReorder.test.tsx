// @vitest-environment jsdom
// State-level gesture tests over the pointer harness — geometry truth lives in the CDP pass.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, stubPointerCapture, stubRect } from '@renderer/testing/pointerHarness'
import { useOptionReorder } from './useOptionReorder'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

const ORDER = ['a', 'b', 'c']

function List({ onReorder }: { onReorder: (value: string, to: number) => void }): React.JSX.Element {
  const dnd = useOptionReorder(ORDER, onReorder)
  return (
    <div ref={dnd.containerRef} data-box>
      {ORDER.map((v) => (
        <div
          key={v}
          ref={(el) => dnd.registerRow(v, el)}
          data-row={v}
          onPointerDown={(e) => dnd.onRowPointerDown(v, e)}
        />
      ))}
    </div>
  )
}

let host: HTMLDivElement
let root: Root
let reorderSpy: ReturnType<typeof vi.fn<(value: string, to: number) => void>>

const stubRows = (offset: number): void => {
  for (const [i, v] of ORDER.entries()) {
    const el = host.querySelector(`[data-row="${v}"]`)
    if (el) stubRect(el, { top: i * 24 + offset, bottom: i * 24 + 24 + offset })
  }
}

beforeEach(async () => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  reorderSpy = vi.fn()
  await act(async () => {
    root.render(<List onReorder={reorderSpy} />)
  })
  const box = host.querySelector('[data-box]')
  if (box) stubRect(box, { top: 0, bottom: 72 })
  stubRows(0)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const row = (v: string): HTMLElement => host.querySelector(`[data-row="${v}"]`) as HTMLElement

const drag = async (v: string, fromY: number, toY: number): Promise<void> => {
  await act(async () => {
    firePointer(row(v), 'pointerdown', { x: 10, y: fromY })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 10, y: toY })
  })
}

describe('option reorder gesture', () => {
  it('commits the without-the-dragged slot on drop', async () => {
    await drag('a', 12, 40)
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    expect(reorderSpy).toHaveBeenCalledExactlyOnceWith('a', 1)
  })

  it('a scroll with the pointer held still re-aims, so a release without moving commits fresh', async () => {
    await drag('a', 12, 40)
    stubRows(-24)
    await act(async () => {
      const box = host.querySelector('[data-box]') as HTMLElement
      box.dispatchEvent(new Event('scroll', { bubbles: false }))
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    expect(reorderSpy).toHaveBeenCalledExactlyOnceWith('a', 2)
  })

  // Identity, not counts — the historical leak removed a DIFFERENT scroll listener than it added.
  // A completed drag first, so the drag's closures no longer come from the mount render.
  it('an unmount mid-drag removes the exact window listeners it added', async () => {
    await drag('a', 12, 40)
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    const adds = vi.spyOn(window, 'addEventListener')
    const removes = vi.spyOn(window, 'removeEventListener')
    await drag('b', 36, 60)
    await act(async () => root.unmount())
    const addedFns = adds.mock.calls.map(([type, fn]) => ({ type, fn }))
    const removedFns = removes.mock.calls.map(([, fn]) => fn)
    for (const { type, fn } of addedFns) {
      expect(removedFns, `leaked '${type}' listener`).toContain(fn)
    }
  })
})
