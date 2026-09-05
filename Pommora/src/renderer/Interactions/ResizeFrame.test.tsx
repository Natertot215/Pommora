// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, pressEscape, stubPointerCapture } from '@renderer/Testing/pointerHarness'
import {
  onScreen,
  useResizeFrame,
  type Rect,
  type ResizeFrameSpec,
  type ResizeGrip,
} from './ResizeFrame'
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

function Frame<R extends Partial<Rect>>(
  props: ResizeFrameSpec<R> & { grip: ResizeGrip },
): React.JSX.Element {
  const frame = useResizeFrame(props)
  return (
    <div className="box" onPointerDown={frame.start(props.grip)}>
      {frame.edges(['se'])}
    </div>
  )
}

const mount = <R extends Partial<Rect>>(
  spec: ResizeFrameSpec<R> & { grip: ResizeGrip },
): HTMLElement => {
  act(() => root.render(<Frame {...spec} />))
  return host.querySelector('.box') as HTMLElement
}

const drag = (el: HTMLElement, x: number, y: number): void => {
  act(() => firePointer(el, 'pointerdown', { x: 0, y: 0 }))
  act(() => firePointer(window, 'pointermove', { x, y }))
}
const release = (): void => act(() => firePointer(window, 'pointerup'))

describe('the resize frame', () => {
  it('an equilateral frame grows the same size from either side and holds its origin', () => {
    const onChange = vi.fn()
    const spec = { rect: { w: 200, h: 100 }, min: { w: 50 }, equilateral: true, onChange }
    drag(mount({ ...spec, grip: 'e' }), 30, 0)
    expect(onChange).toHaveBeenLastCalledWith({ w: 230, h: 100 }, 'move')
    release()
    onChange.mockClear()
    drag(mount({ ...spec, grip: 'w' }), -30, 0)
    expect(onChange).toHaveBeenLastCalledWith({ w: 230, h: 100 }, 'move')
    release()
  })

  it('a free frame carries its origin on a leading-edge pull and clamps at the viewport', () => {
    const onChange = vi.fn()
    const rect = { x: 100, y: 50, w: 200, h: 100 }
    drag(mount({ rect, min: { w: 50, h: 50 }, onChange, grip: 'w' }), -150, 0)
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: 50, w: 300, h: 100 }, 'move')
    release()
    drag(mount({ rect, min: { w: 50, h: 50 }, onChange, grip: 'n' }), 0, 80)
    expect(onChange).toHaveBeenLastCalledWith({ x: 100, y: 100, w: 200, h: 50 }, 'move')
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
    expect(onChange).toHaveBeenLastCalledWith({ w: 260, h: 100 }, 'move')
    cap = 240
    act(() => firePointer(window, 'pointermove', { x: 110, y: 0 }))
    expect(onChange).toHaveBeenLastCalledWith({ w: 240, h: 100 }, 'move')
    release()
  })

  it('release drops the last size; Escape hands back the start', () => {
    const onChange = vi.fn()
    const spec = { rect: { w: 200, h: 100 }, equilateral: true, onChange }
    const el = mount({ ...spec, grip: 'e' })
    drag(el, 30, 0)
    release()
    expect(onChange).toHaveBeenLastCalledWith({ w: 230, h: 100 }, 'drop')
    drag(el, 40, 0)
    act(() => pressEscape())
    expect(onChange).toHaveBeenLastCalledWith({ w: 200, h: 100 }, 'abort')
  })

  it('a rect given as a function is measured at each press', () => {
    const onChange = vi.fn()
    let measured = 100
    const el = mount({ rect: () => ({ h: measured }), equilateral: true, onChange, grip: 's' })
    drag(el, 0, 30)
    expect(onChange).toHaveBeenLastCalledWith({ h: 130 }, 'move')
    release()
    measured = 300
    drag(el, 0, 30)
    expect(onChange).toHaveBeenLastCalledWith({ h: 330 }, 'move')
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
    expect(onChange).toHaveBeenLastCalledWith({ w: 200, h: 100 }, 'move')
    release()
    expect(onChange).not.toHaveBeenCalledWith(expect.anything(), 'drop')
  })

  it('a release at the same size as the start does not drop', () => {
    const onChange = vi.fn()
    const el = mount({ rect: { h: 64 }, min: { h: 64 }, equilateral: true, onChange, grip: 's' })
    drag(el, 0, -40)
    release()
    expect(onChange).not.toHaveBeenCalledWith(expect.anything(), 'drop')
  })

  it('a move keeps a grab of the frame on screen', () => {
    const onChange = vi.fn()
    drag(mount({ rect: { x: 100, y: 50, w: 200, h: 100 }, onChange, grip: 'move' }), 5000, -500)
    expect(onChange).toHaveBeenLastCalledWith({ x: 920, y: 0, w: 200, h: 100 }, 'move')
    release()
    expect(onScreen({ x: -10, y: 900, w: 1200, h: 100 })).toEqual({ x: 0, y: 760, w: 1000, h: 100 })
  })
})
