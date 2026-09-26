// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, pressEscape, stubPointerCapture } from '../Testing/pointerHarness'
import {
  onScreen,
  useResizable,
  type Rect,
  type ResizableSpec,
  type ResizeGrip,
} from './useResizable'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

function Box<R extends Partial<Rect>>(
  props: ResizableSpec<R> & { grip: ResizeGrip },
): React.JSX.Element {
  const resize = useResizable(props)
  return (
    <div className="box" onPointerDown={resize.start(props.grip)}>
      {resize.edges(['se'])}
    </div>
  )
}

const mount = <R extends Partial<Rect>>(
  spec: ResizableSpec<R> & { grip: ResizeGrip },
): HTMLElement => {
  act(() => root.render(<Box {...spec} />))
  return host.querySelector('.box') as HTMLElement
}

const drag = (el: HTMLElement, x: number, y: number): void => {
  act(() => firePointer(el, 'pointerdown', { x: 0, y: 0 }))
  act(() => firePointer(window, 'pointermove', { x, y }))
}
const release = (): void => act(() => firePointer(window, 'pointerup'))

describe('a resizable box', () => {
  it('an equilateral box grows the same size from either side and holds its origin', () => {
    const onChange = vi.fn()
    const spec = { rect: { w: 200, h: 100 }, min: { w: 50 }, equilateral: true, onChange }
    drag(mount({ ...spec, grip: 'e' }), 30, 0)
    expect(onChange).toHaveBeenLastCalledWith({ w: 230, h: 100 }, 'move', 'e')
    release()
    onChange.mockClear()
    drag(mount({ ...spec, grip: 'w' }), -30, 0)
    expect(onChange).toHaveBeenLastCalledWith({ w: 230, h: 100 }, 'move', 'w')
    release()
  })

  it('a free box carries its origin on a leading-edge pull and clamps at the viewport', () => {
    const onChange = vi.fn()
    const rect = { x: 100, y: 50, w: 200, h: 100 }
    drag(mount({ rect, min: { w: 50, h: 50 }, onChange, grip: 'w' }), -150, 0)
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: 50, w: 300, h: 100 }, 'move', 'w')
    release()
    drag(mount({ rect, min: { w: 50, h: 50 }, onChange, grip: 'n' }), 0, 80)
    expect(onChange).toHaveBeenLastCalledWith({ x: 100, y: 100, w: 200, h: 50 }, 'move', 'n')
    release()
  })

  it('a live ceiling is read per move', () => {
    const onChange = vi.fn()
    let cap = 260
    const el = mount({
      rect: { w: 200, h: 100 },
      max: () => ({ w: cap }),
      equilateral: true,
      onChange,
      grip: 'e',
    })
    drag(el, 100, 0)
    expect(onChange).toHaveBeenLastCalledWith({ w: 260, h: 100 }, 'move', 'e')
    cap = 240
    act(() => firePointer(window, 'pointermove', { x: 110, y: 0 }))
    expect(onChange).toHaveBeenLastCalledWith({ w: 240, h: 100 }, 'move', 'e')
    release()
  })

  it('release drops the last size; Escape hands back the start', () => {
    const onChange = vi.fn()
    const spec = { rect: { w: 200, h: 100 }, equilateral: true, onChange }
    const el = mount({ ...spec, grip: 'e' })
    drag(el, 30, 0)
    release()
    expect(onChange).toHaveBeenLastCalledWith({ w: 230, h: 100 }, 'drop', 'e')
    drag(el, 40, 0)
    act(() => pressEscape())
    expect(onChange).toHaveBeenLastCalledWith({ w: 200, h: 100 }, 'abort', 'e')
  })

  it('a rect given as a function is measured at each press', () => {
    const onChange = vi.fn()
    let measured = 100
    const el = mount({ rect: () => ({ h: measured }), equilateral: true, onChange, grip: 's' })
    drag(el, 0, 30)
    expect(onChange).toHaveBeenLastCalledWith({ h: 130 }, 'move', 's')
    release()
    measured = 300
    drag(el, 0, 30)
    expect(onChange).toHaveBeenLastCalledWith({ h: 330 }, 'move', 's')
    release()
  })

  it('a release that never travelled neither moves nor drops', () => {
    const onChange = vi.fn()
    const el = mount({ rect: { w: 200, h: 100 }, equilateral: true, onChange, grip: 'e' })
    drag(el, 0, 0)
    release()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a drag back to its origin restores the start and does not drop', () => {
    const onChange = vi.fn()
    const el = mount({ rect: { w: 200, h: 100 }, equilateral: true, onChange, grip: 'e' })
    drag(el, 30, 0)
    act(() => firePointer(window, 'pointermove', { x: 0, y: 0 }))
    expect(onChange).toHaveBeenLastCalledWith({ w: 200, h: 100 }, 'move', 'e')
    release()
    expect(onChange).not.toHaveBeenCalledWith(expect.anything(), 'drop', 'e')
  })

  it('a release at the same size as the start does not drop', () => {
    const onChange = vi.fn()
    const el = mount({ rect: { h: 64 }, min: { h: 64 }, equilateral: true, onChange, grip: 's' })
    drag(el, 0, -40)
    release()
    expect(onChange).not.toHaveBeenCalledWith(expect.anything(), 'drop', 's')
  })

  it('a move keeps a grab of the box on screen', () => {
    const onChange = vi.fn()
    drag(mount({ rect: { x: 100, y: 50, w: 200, h: 100 }, onChange, grip: 'move' }), 5000, -500)
    expect(onChange).toHaveBeenLastCalledWith({ x: 920, y: 0, w: 200, h: 100 }, 'move', 'move')
    release()
    expect(onScreen({ x: -10, y: 900, w: 1200, h: 100 })).toEqual({ x: 0, y: 760, w: 1000, h: 100 })
  })
})
