// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, Profiler, StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useDismissal } from '../Interactions/dismissalStack'
import { firePointer, stubPointerCapture } from '../Utilities/pointerHarness'
import type { Size } from '../Interactions/useResizable'
import { WindowBase, type WindowFooter } from './WindowBase'
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
  footer?: WindowFooter
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

const footer = (fold: Partial<WindowFooter> = {}): WindowFooter => ({
  bar: <span />,
  open: true,
  onOpenChange: () => undefined,
  label: () => 'Fold',
  ...fold,
})

const geo = (el: HTMLElement): Record<string, string> => ({
  left: el.style.left,
  top: el.style.top,
  width: el.style.width,
  height: el.style.height,
})

// The click a browser sends after the release, which a drag swallows.
const release = (): void => {
  act(() => firePointer(window, 'pointerup'))
  document.dispatchEvent(new MouseEvent('click'))
}

const grab = (el: HTMLElement, moves: readonly [number, number][]): void => {
  act(() => firePointer(el, 'pointerdown', { x: 0, y: 0 }))
  for (const [x, y] of moves) act(() => firePointer(window, 'pointermove', { x, y }))
  release()
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

describe('a floating window takes Escape by front-to-back order', () => {
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

  it('a press raises a window, and Escape then closes it first', () => {
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
    const first = host.querySelector('[aria-label="first"]') as HTMLElement
    act(() =>
      firePointer(first.querySelector('.window-toolbar') as HTMLElement, 'pointerdown', {
        x: 0,
        y: 0,
      }),
    )
    expect(first.style.getPropertyValue('--window-rank')).toBe('1')
    pressEscape()
    expect(log).toEqual(['first'])
    pressEscape()
    expect(log).toEqual(['first', 'second'])
  })

  it('an Escape entry inside a window behind the front one is skipped', () => {
    const log: string[] = []
    function Inner(): null {
      const ref = useRef<HTMLElement | null>(null)
      useEffect(() => {
        ref.current = document.querySelector('[aria-label="back"] .body')
      })
      useDismissal(true, false, {
        layer: () => ref.current,
        dismiss: () => log.push('inner'),
        outsidePress: false,
      })
      return null
    }
    act(() =>
      root.render(
        <>
          <WindowBase closing={false} onClose={() => log.push('back')} ariaLabel="back">
            <div className="body" />
          </WindowBase>
          <WindowBase closing={false} onClose={() => log.push('front')} ariaLabel="front">
            <div />
          </WindowBase>
          <Inner />
        </>,
      ),
    )
    pressEscape()
    expect(log).toEqual(['front'])
  })

  it('focus entering a frame inside a window behind raises it', () => {
    act(() =>
      root.render(
        <>
          <WindowBase closing={false} onClose={() => undefined} ariaLabel="web">
            <iframe title="page" />
          </WindowBase>
          <WindowBase closing={false} onClose={() => undefined} ariaLabel="front">
            <div />
          </WindowBase>
        </>,
      ),
    )
    const web = host.querySelector('[aria-label="web"]') as HTMLElement
    const frame = web.querySelector('iframe') as HTMLIFrameElement
    const active = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(frame)
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    active.mockRestore()
    expect(web.style.getPropertyValue('--window-rank')).toBe('1')
  })

  it('a summon onto a window behind brings it to the front', () => {
    const two = (summon: number): React.JSX.Element => (
      <>
        <WindowBase closing={false} onClose={() => undefined} raiseOn={summon} ariaLabel="back">
          <div />
        </WindowBase>
        <WindowBase closing={false} onClose={() => undefined} ariaLabel="front">
          <div />
        </WindowBase>
      </>
    )
    act(() => root.render(two(0)))
    act(() => root.render(two(1)))
    const back = host.querySelector('[aria-label="back"]') as HTMLElement
    expect(back.style.getPropertyValue('--window-rank')).toBe('1')
  })
})

describe('a floating window hands focus back when it closes', () => {
  it('returns focus to where it was under StrictMode', () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    const win = (closing: boolean): React.JSX.Element => (
      <StrictMode>
        <WindowBase closing={closing} onClose={() => undefined} ariaLabel="Test">
          <div />
        </WindowBase>
      </StrictMode>
    )
    act(() => root.render(win(false)))
    expect(document.activeElement).toBe(host.querySelector('.window'))
    act(() => root.render(win(true)))
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('returns focus through each window that replaced the one it opened from', () => {
    const field = document.createElement('textarea')
    document.body.appendChild(field)
    field.focus()
    const win = (name: string, closing: boolean): React.JSX.Element => (
      <WindowBase key={name} closing={closing} onClose={() => undefined} ariaLabel={name}>
        <div />
      </WindowBase>
    )
    act(() => root.render(win('a', false)))
    expect(document.activeElement).toBe(host.querySelector('[aria-label="a"]'))
    act(() => root.render([win('a', true), win('b', false)]))
    act(() => root.render(win('b', false)))
    act(() => root.render([win('b', true), win('c', false)]))
    act(() => root.render(win('c', false)))
    act(() => root.render(win('c', true)))
    expect(document.activeElement).toBe(field)
    field.remove()
  })

  it('a press on the window itself takes the keyboard back into it', () => {
    const el = mount({})
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    act(() => firePointer(el, 'pointerdown', { x: 10, y: 10 }))
    release()
    expect(document.activeElement).toBe(el)
    outside.remove()
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
    const el = mount({ footer: footer({ lead: <button type="button" data-reveal-lead /> }) })
    const boxes = [
      el,
      ...el.querySelectorAll<HTMLElement>('[data-reveal-trail], [data-reveal-lead]'),
    ]
    const measures = boxes.map((b) => vi.spyOn(b, 'getBoundingClientRect'))
    const drag = el.querySelector('.window-drag') as HTMLElement
    act(() => firePointer(drag, 'pointerdown', { x: 0, y: 0 }))
    for (const x of [10, 20, 30]) act(() => firePointer(drag, 'pointermove', { x, y: 0 }))
    release()
    for (const m of measures) expect(m).not.toHaveBeenCalled()
    for (const x of [40, 50]) act(() => firePointer(el, 'pointermove', { x, y: -500, buttons: 0 }))
    for (const m of measures) expect(m).toHaveBeenCalledTimes(1)
  })
})

describe('the footer toggle reveals within reach of itself', () => {
  const rect = (left: number, top: number, right: number, bottom: number): DOMRect =>
    ({ left, top, right, bottom, width: right - left, height: bottom - top }) as DOMRect
  const setup = (): { el: HTMLElement; trail: HTMLElement } => {
    const el = mount({ footer: footer() })
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

describe('the footer folds as its host says', () => {
  it('draws the fold it is handed and reports a toggle rather than holding it', () => {
    const onOpenChange = vi.fn()
    const el = mount({ footer: footer({ open: false, onOpenChange }) })
    expect(el.classList.contains('is-footer-open')).toBe(false)
    act(() => (el.querySelector('.window-footer-toggle') as HTMLElement).click())
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(el.classList.contains('is-footer-open')).toBe(false)
  })
})

describe('a side panel keeps its width across windows of one id', () => {
  it('a width dragged in one window opens the next window of that id at it, on the first frame', () => {
    const side = (children: React.ReactNode) => ({
      windowId: 'panel-test',
      bounds: { min: 100, default: 200, max: 400 },
      mode: 'overlay' as const,
      children,
    })
    act(() =>
      root.render(
        <WindowBase closing={false} onClose={() => undefined} ariaLabel="a" right={side(null)}>
          <div />
        </WindowBase>,
      ),
    )
    const strip = host.querySelector('.window-panel-right-overlay-resize') as HTMLElement
    act(() => firePointer(strip, 'pointerdown', { x: 600, y: 10 }))
    act(() => firePointer(window, 'pointermove', { x: 550, y: 10 }))
    act(() => firePointer(window, 'pointerup', { x: 550, y: 10 }))
    act(() => root.unmount())
    root = createRoot(host)
    act(() =>
      root.render(
        <WindowBase closing={false} onClose={() => undefined} ariaLabel="b" right={side(null)}>
          <div />
        </WindowBase>,
      ),
    )
    const win = host.querySelector('.window') as HTMLElement
    expect(win.style.getPropertyValue('--window-panel-r-w')).toBe('250px')
  })

  it('a drag frame renders the window once', () => {
    let commits = 0
    act(() =>
      root.render(
        <Profiler id="window" onRender={() => commits++}>
          <WindowBase
            closing={false}
            onClose={() => undefined}
            ariaLabel="a"
            right={{
              windowId: 'panel-frame-test',
              bounds: { min: 100, default: 200, max: 400 },
              mode: 'overlay',
              children: null,
            }}
          >
            <div />
          </WindowBase>
        </Profiler>,
      ),
    )
    const strip = host.querySelector('.window-panel-right-overlay-resize') as HTMLElement
    act(() => firePointer(strip, 'pointerdown', { x: 600, y: 10 }))
    act(() => firePointer(window, 'pointermove', { x: 580, y: 10 }))
    commits = 0
    act(() => firePointer(window, 'pointermove', { x: 550, y: 10 }))
    expect(commits).toBe(1)
    act(() => firePointer(window, 'pointerup', { x: 550, y: 10 }))
  })
})
