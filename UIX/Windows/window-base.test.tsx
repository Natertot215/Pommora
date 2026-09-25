// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, stubPointerCapture } from '../Interactions/pointerHarness'
import type { Size } from '../Interactions/ResizeFrame'
import { WindowBase } from './window-base'
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

const mount = (props: {
  initialSize?: Size
  onSizeChange?: (s: Size) => void
  footer?: React.ReactNode
  footerLead?: React.ReactNode
}): HTMLElement => {
  act(() =>
    root.render(
      <WindowBase closing={false} onClose={() => undefined} ariaLabel="Test" {...props}>
        <div className="body" />
      </WindowBase>,
    ),
  )
  return host.querySelector('.window') as HTMLElement
}

const geo = (el: HTMLElement): Record<string, string> => ({
  left: el.style.left,
  top: el.style.top,
  width: el.style.width,
  height: el.style.height,
})

const grab = (el: HTMLElement, moves: readonly [number, number][]): void => {
  act(() => firePointer(el, 'pointerdown', { x: 0, y: 0 }))
  for (const [x, y] of moves) act(() => firePointer(window, 'pointermove', { x, y }))
  act(() => firePointer(window, 'pointerup'))
}

describe('a floating window opens at the size it is given', () => {
  it('opens at the default when no size is handed in', () => {
    expect(geo(mount({}))).toEqual({ left: '75px', top: '67px', width: '850px', height: '600px' })
  })

  it('opens at the size it is handed, centered horizontally and a third down', () => {
    expect(geo(mount({ initialSize: { w: 400, h: 300 } }))).toEqual({
      left: '300px',
      top: '167px',
      width: '400px',
      height: '300px',
    })
  })

  it('a size remembered from a larger display is clamped onto this viewport', () => {
    expect(geo(mount({ initialSize: { w: 2000, h: 1500 } }))).toEqual({
      left: '0px',
      top: '0px',
      width: '1000px',
      height: '800px',
    })
  })
})

describe('a floating window takes Escape by open order', () => {
  const pressEscape = (): void =>
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })

  it('closes the newest window only, then the one beneath it', () => {
    const log: string[] = []
    function Two(): React.JSX.Element {
      const [closed, setClosed] = useState<readonly string[]>([])
      const win = (name: string): React.JSX.Element => (
        <WindowBase
          key={name}
          closing={closed.includes(name)}
          onClose={() => {
            log.push(name)
            setClosed((c) => [...c, name])
          }}
          ariaLabel={name}
        >
          <div />
        </WindowBase>
      )
      return (
        <>
          {win('first')}
          {win('second')}
        </>
      )
    }
    act(() => root.render(<Two />))
    pressEscape()
    expect(log).toEqual(['second'])
    pressEscape()
    expect(log).toEqual(['second', 'first'])
  })
})

describe('a floating window reports its size once per drag', () => {
  it('a resize reports on the drop, not on each move', () => {
    const onSizeChange = vi.fn()
    const el = mount({ initialSize: { w: 400, h: 300 }, onSizeChange })
    grab(el.querySelector('.resize-edge-se') as HTMLElement, [
      [20, 10],
      [50, 40],
    ])
    expect(onSizeChange.mock.calls).toEqual([[{ w: 450, h: 340 }]])
  })

  it('a move reports no size', () => {
    const onSizeChange = vi.fn()
    const el = mount({ initialSize: { w: 400, h: 300 }, onSizeChange })
    grab(el.querySelector('.window-drag') as HTMLElement, [[60, 30]])
    expect(onSizeChange).not.toHaveBeenCalled()
    expect(geo(el).left).toBe('360px')
  })

  it('a press that moves nothing reports nothing', () => {
    const onSizeChange = vi.fn()
    const el = mount({ initialSize: { w: 400, h: 300 }, onSizeChange })
    grab(el.querySelector('.resize-edge-se') as HTMLElement, [])
    expect(onSizeChange).not.toHaveBeenCalled()
  })
})

describe('the footer reveal measures its toggles only while the pointer moves free', () => {
  it('a held move never measures, and the first free move after it measures once', () => {
    const el = mount({ footer: <span />, footerLead: <button type="button" data-reveal-lead /> })
    const boxes = [
      el,
      ...el.querySelectorAll<HTMLElement>('[data-reveal-trail], [data-reveal-lead]'),
    ]
    const measures = boxes.map((b) => vi.spyOn(b, 'getBoundingClientRect'))
    const drag = el.querySelector('.window-drag') as HTMLElement
    act(() => firePointer(drag, 'pointerdown', { x: 0, y: 0 }))
    for (const x of [10, 20, 30]) act(() => firePointer(drag, 'pointermove', { x, y: 0 }))
    act(() => firePointer(window, 'pointerup'))
    for (const m of measures) expect(m).not.toHaveBeenCalled()
    for (const x of [40, 50]) act(() => firePointer(el, 'pointermove', { x, y: -500, buttons: 0 }))
    for (const m of measures) expect(m).toHaveBeenCalledTimes(1)
  })
})

describe('the footer toggle reveals within reach of itself', () => {
  const rect = (left: number, top: number, right: number, bottom: number): DOMRect =>
    ({ left, top, right, bottom, width: right - left, height: bottom - top }) as DOMRect
  const setup = (): { el: HTMLElement; trail: HTMLElement } => {
    const el = mount({ footer: <span /> })
    const trail = el.querySelector('[data-reveal-trail]') as HTMLElement
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 1000, 600))
    vi.spyOn(trail, 'getBoundingClientRect').mockReturnValue(rect(900, 552, 940, 576))
    return { el, trail }
  }
  const at = (el: HTMLElement, x: number, y: number): void => {
    act(() => firePointer(el, 'pointermove', { x, y, buttons: 0 }))
  }

  it('reaches 280 across and 140 up from the toggle, down to the window bottom', () => {
    const { el } = setup()
    at(el, 900 - 280, 560)
    expect(el.classList.contains('is-footer-near')).toBe(true)
    at(el, 900 - 290, 560)
    expect(el.classList.contains('is-footer-near')).toBe(false)
    at(el, 920, 552 - 140)
    expect(el.classList.contains('is-footer-near')).toBe(true)
    at(el, 920, 590)
    expect(el.classList.contains('is-footer-near')).toBe(true)
  })

  it('measures again once the window or a toggle ends a transition', () => {
    const { el, trail } = setup()
    at(el, 920, 560)
    vi.spyOn(trail, 'getBoundingClientRect').mockReturnValue(rect(600, 552, 640, 576))
    act(() => el.dispatchEvent(new Event('transitionend', { bubbles: true })))
    at(el, 920, 560)
    expect(el.classList.contains('is-footer-near')).toBe(false)
  })
})
