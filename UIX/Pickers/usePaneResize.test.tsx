// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, pressEscape, stubPointerCapture } from '../Testing/pointerHarness'
import type { Size } from '../Interactions/useResizable'
import { PickerMenu } from './PickerMenu'
import { type PaneBounds, usePaneResize } from './usePaneResize'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

stubPointerCapture()

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  Object.assign(window, { innerWidth: 1000, innerHeight: 800 })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const LIST: PaneBounds = { min: { w: 180, h: 120 }, max: { w: 480 }, default: { h: 240 } }

function Pane({
  bounds,
  initialSize,
  onSizeChange = () => {},
  open = true,
  direction,
}: {
  bounds: PaneBounds
  initialSize?: Size
  onSizeChange?: (size: Partial<Size>) => void
  open?: boolean
  direction?: 'up' | 'down'
}): React.JSX.Element {
  const resize = usePaneResize(open, bounds, { initialSize, onSizeChange })
  return (
    <PickerMenu
      open={open}
      anchorX={100}
      anchorY={100}
      manageFocus={false}
      direction={direction}
      resize={resize}
    >
      <div data-body="" style={{ width: resize.size.w, maxHeight: resize.size.h }} />
    </PickerMenu>
  )
}

const mount = (props: Parameters<typeof Pane>[0]): void =>
  act(() => root.render(<Pane {...props} />))
const body = (): HTMLElement => document.querySelector('[data-body]') as HTMLElement
const edges = (): string[] =>
  [...document.querySelectorAll('.resize-edge')].map(
    (e) => e.className.match(/resize-edge-(\w+)/)?.[1] ?? '',
  )

// jsdom lays nothing out, so the pane's box is stubbed on the element the edges sit in.
function drag(edge: string, dx: number, dy: number, box: Size, release = true): void {
  const el = document.querySelector<HTMLElement>(`.resize-edge-${edge}`)
  if (!el) throw new Error(`no ${edge} edge`)
  Object.defineProperties(el.parentElement, {
    clientWidth: { value: box.w, configurable: true },
    clientHeight: { value: box.h, configurable: true },
  })
  act(() => {
    firePointer(el, 'pointerdown')
    firePointer(el, 'pointermove', { x: dx, y: dy })
    if (release) firePointer(el, 'pointerup', { x: dx, y: dy })
  })
}

const BLOCK: PaneBounds = { min: { h: 180 }, default: { h: 240 } }

describe('usePaneResize', () => {
  it('offers only the edges of the axes with a floor, on the side away from the anchor', () => {
    mount({ bounds: BLOCK })
    expect(edges()).toEqual(['s'])
    mount({ bounds: LIST })
    expect(edges()).toEqual(['e', 'w', 's', 'se', 'sw'])
  })

  it('turns its free edges up when the pane opens above its anchor', () => {
    mount({ bounds: LIST, direction: 'up' })
    expect(edges()).toEqual(['e', 'w', 'n', 'ne', 'nw'])
  })

  it('leaves an axis without a default to its content until it is resized', () => {
    mount({ bounds: LIST })
    expect([body().style.width, body().style.maxHeight]).toEqual(['', '240px'])
  })

  it('pulls from the box on screen and keeps the ceiling an unpulled axis held', () => {
    const save = vi.fn()
    mount({ bounds: LIST, onSizeChange: save })
    drag('e', 40, 0, { w: 200, h: 90 })
    expect(save).toHaveBeenCalledWith({ w: 240, h: 240 })
    expect([body().style.width, body().style.maxHeight]).toEqual(['240px', '240px'])
  })

  it('never lowers the ceiling a short list sat under on a pull outward, and tracks a pull inward', () => {
    const save = vi.fn()
    mount({ bounds: BLOCK, initialSize: { w: 132, h: 400 }, onSizeChange: save })
    drag('s', 0, 50, { w: 132, h: 100 })
    expect(save).toHaveBeenLastCalledWith({ w: 132, h: 400 })
    drag('s', 0, -50, { w: 132, h: 400 })
    expect(save).toHaveBeenLastCalledWith({ w: 132, h: 350 })
  })

  it('hands back the size it held on Escape', () => {
    mount({ bounds: LIST })
    drag('e', 40, 0, { w: 200, h: 90 }, false)
    expect(body().style.width).toBe('240px')
    act(() => pressEscape())
    expect(body().style.width).toBe('')
  })

  it('reopens at the remembered size rather than the last drag', () => {
    mount({ bounds: LIST })
    drag('e', 40, 0, { w: 200, h: 90 })
    mount({ bounds: LIST, open: false })
    mount({ bounds: LIST })
    expect(body().style.width).toBe('')
  })

  it('keeps fitting its width to its content through a height-only drag', () => {
    const save = vi.fn()
    mount({ bounds: LIST, onSizeChange: save })
    drag('s', 0, 50, { w: 200, h: 240 })
    expect(save.mock.lastCall?.[0]).toStrictEqual({ h: 290 })
    expect([body().style.width, body().style.maxHeight]).toEqual(['', '290px'])
  })

  it('opens a remembered size clamped to its bounds', () => {
    mount({ bounds: LIST, initialSize: { w: 900.4, h: 60 } })
    expect([body().style.width, body().style.maxHeight]).toEqual(['480px', '120px'])
  })
})
