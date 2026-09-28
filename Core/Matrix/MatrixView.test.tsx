// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '../Contract/result'
import { hoverGlance, leaveGlanceFrom } from '../Interface/Glance/glanceAction'
import { showEntityMenu } from '../Interface/Menus/entityMenuActions'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { stubDialer } from '../vitest.setup'
import { DEFAULT_MATRIX_CONFIG } from './matrixConfig'
import * as s from './matrix.css'
import { MatrixView } from './MatrixView'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../Interface/Glance/glanceAction', async (actual) => ({
  ...(await actual<object>()),
  hoverGlance: vi.fn(),
  leaveGlanceFrom: vi.fn(),
}))
vi.mock('../Interface/Menus/entityMenuActions', () => ({ showEntityMenu: vi.fn(async () => {}) }))

const observers: Array<(entries: unknown[]) => void> = []
class ResizeObserverStub {
  constructor(fire: (entries: unknown[]) => void) {
    observers.push(fire)
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

let frames = new Map<number, () => void>()
let nextFrame = 0
const drain = (limit = 50): void => {
  for (let n = 0; frames.size > 0 && n < limit; n++) {
    const queued = [...frames.values()]
    frames = new Map()
    act(() => {
      for (const fn of queued) fn()
    })
  }
}

// The stage is 800×600 and its lens centres on the origin at zoom 1, so p1, seated at the origin, sits at the canvas centre.
const CENTRE = { clientX: 400, clientY: 300 }
const FAR = { clientX: 20, clientY: 20 }

const pointer = (type: string, at: { clientX: number; clientY: number }, shiftKey = false) => {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, shiftKey, ...at })
  Object.defineProperty(e, 'pointerId', { value: 1 })
  Object.defineProperty(e, 'isPrimary', { value: true })
  return e
}

let host: HTMLDivElement
let root: Root
let select: ReturnType<typeof vi.fn>

const canvas = (): HTMLCanvasElement => host.querySelector('canvas') as HTMLCanvasElement
const label = (): HTMLElement | null => host.querySelector(`.${s.label.split(' ')[0]}`)

const fire = (el: EventTarget, e: Event): Event => {
  act(() => {
    el.dispatchEvent(e)
  })
  return e
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  observers.length = 0
  frames = new Map()
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
    frames.set(++nextFrame, fn)
    return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.stubGlobal('matchMedia', () => ({ addEventListener() {}, removeEventListener() {} }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.mocked(hoverGlance).mockClear()
  vi.mocked(leaveGlanceFrom).mockClear()
  vi.mocked(showEntityMenu).mockClear()
  select = vi.fn()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'matrixLayout:save': async () => ok(null),
  })
  const far = (i: number): [number, number] => [2000 + i * 300, 2000]
  useSession.setState({
    tree: makeTree(),
    select: select as never,
    matrixConfig: DEFAULT_MATRIX_CONFIG,
    matrixGraph: { links: [], values: {} },
    matrixPositions: Object.fromEntries([
      ['p1', [0, 0]],
      ...['p2', 'c1', 's1', 'a1', 't1', 'pr1'].map((id, i) => [id, far(i)]),
    ]),
    matrixLens: { cx: 0, cy: 0, w: 800, h: 600 },
    matrixLoad: { kind: 'loaded' },
  } as never)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<MatrixView />))
  for (const o of observers) o([{ contentRect: { x: 0, y: 0, width: 800, height: 600 } }])
  drain()
})

afterEach(() => {
  // Drained rather than dropped: a frame left queued keeps the runtime's own handle set, and every later request is a no-op.
  drain(5000)
  act(() => root.unmount())
  act(() => vi.runAllTimers())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('MatrixView', () => {
  it('opens the node that was pressed when the graph renumbers mid-press', () => {
    fire(canvas(), pointer('pointerdown', CENTRE))
    const grown = makeTree()
    grown.collections[0].pages.unshift({
      kind: 'page',
      id: 'p0',
      title: 'Zero',
      path: 'Notes/Zero.md',
    })
    act(() => useSession.setState({ tree: grown }))
    fire(window, pointer('pointerup', CENTRE))
    expect(select).toHaveBeenCalledTimes(1)
    expect(select.mock.calls[0][0]).toMatchObject({ id: 'p1' })
  })

  it('keeps a Shift-hover preview armed through a tree push', () => {
    fire(canvas(), pointer('pointermove', CENTRE, true))
    drain()
    expect(hoverGlance).toHaveBeenCalledTimes(1)
    act(() => useSession.setState({ tree: makeTree() }))
    drain()
    expect(leaveGlanceFrom).not.toHaveBeenCalled()
    expect(hoverGlance).toHaveBeenCalledTimes(1)
  })

  it('fades the label in on every hover, not only the first', () => {
    const hoverIn = (): void => {
      fire(canvas(), pointer('pointermove', CENTRE))
      drain(1)
      expect(label()?.classList.contains(s.labelShown)).toBe(false)
      drain()
      expect(label()?.classList.contains(s.labelShown)).toBe(true)
    }
    hoverIn()
    fire(canvas(), pointer('pointermove', FAR))
    drain()
    act(() => vi.runAllTimers())
    expect(label()).toBeNull()
    hoverIn()
  })

  it('seats the menu anchor on the node before it asks, with nothing hovered', () => {
    fire(canvas(), pointer('contextmenu', CENTRE))
    expect(showEntityMenu).toHaveBeenCalledTimes(1)
    const anchor = vi.mocked(showEntityMenu).mock.calls[0][1]
    expect(anchor?.dataset.nodeId).toBe('p1')
  })

  it('leaves a right-click off the canvas to the system menu', () => {
    const over = document.createElement('input')
    host.firstElementChild?.appendChild(over)
    expect(fire(over, pointer('contextmenu', CENTRE)).defaultPrevented).toBe(false)
    expect(fire(canvas(), pointer('contextmenu', FAR)).defaultPrevented).toBe(true)
  })

  it('reads the canvas box once per hover, and again after a leave, a press, or a resize', () => {
    const box = vi.spyOn(canvas(), 'getBoundingClientRect')
    for (const x of [100, 110, 120])
      fire(canvas(), pointer('pointermove', { clientX: x, clientY: 20 }))
    expect(box).toHaveBeenCalledTimes(1)
    const moveAfter = (lets: () => void, reads: number): void => {
      lets()
      fire(canvas(), pointer('pointermove', { clientX: 130, clientY: 20 }))
      expect(box).toHaveBeenCalledTimes(reads)
    }
    moveAfter(
      () =>
        fire(host.firstElementChild as Element, new MouseEvent('pointerout', { bubbles: true })),
      2,
    )
    moveAfter(() => {
      fire(canvas(), pointer('pointerdown', FAR))
      fire(window, pointer('pointerup', FAR))
    }, 3)
    moveAfter(() => {
      for (const o of observers) o([{ contentRect: { x: 0, y: 0, width: 800, height: 600 } }])
    }, 4)
    moveAfter(() => fire(window, new Event('resize')), 5)
  })

  it('leaves the hover where a gesture began', () => {
    const held = (at: { clientX: number; clientY: number }) => {
      const e = pointer('pointermove', at)
      Object.defineProperty(e, 'buttons', { value: 1 })
      return e
    }
    fire(canvas(), pointer('pointermove', FAR))
    fire(canvas(), held(CENTRE))
    drain()
    expect(label()).toBeNull()
  })
})
