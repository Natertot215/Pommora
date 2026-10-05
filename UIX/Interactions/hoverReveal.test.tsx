// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  REVEAL_DWELL_MS,
  REVEAL_GRACE_MS,
  REVEAL_REACH,
  type Nearness,
  trackNear,
  useHoverReveal,
  useRevealWithin,
  withinBox,
  withinReach,
} from './hoverReveal'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Props = Parameters<typeof useHoverReveal>[0]

let api: ReturnType<typeof useHoverReveal>
let props: Props

function Probe(p: Props): React.JSX.Element {
  api = useHoverReveal(p)
  return <span />
}

let host: HTMLDivElement
let root: Root

const render = async (next: Partial<Props> = {}): Promise<void> => {
  props = { ...props, ...next }
  await act(async () => root.render(<Probe {...props} />))
}
const tick = async (ms: number): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}
const run = async (fn: () => void): Promise<void> => {
  await act(async () => fn())
}
const pointer = (type: string, button = 0): Promise<void> =>
  run(() => window.dispatchEvent(Object.assign(new Event(type), { button })))
const coarse = (matches: boolean): void => {
  window.matchMedia = ((query: string) => ({
    matches: matches && query === '(hover: none)',
  })) as never
}

beforeEach(async () => {
  vi.useFakeTimers()
  coarse(false)
  props = { active: true, dwell: true, held: false }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await render()
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('useHoverReveal with a dwell', () => {
  it('opens after the dwell and closes after the grace', async () => {
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS - 1)
    expect(api.on).toBe(false)
    await tick(1)
    expect(api.on).toBe(true)
    await run(() => api.hover(false))
    await tick(REVEAL_GRACE_MS)
    expect(api.on).toBe(false)
  })

  it('re-entering within the grace keeps it open', async () => {
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS)
    await run(() => api.hover(false))
    await run(() => api.hover(true))
    await tick(REVEAL_GRACE_MS * 2)
    expect(api.on).toBe(true)
  })

  it('repeated hovers inside the zone never restart the dwell', async () => {
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS / 2)
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS / 2)
    expect(api.on).toBe(true)
  })

  it('held sustains an open dwell past a leave, then closes on release', async () => {
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS)
    await render({ held: true })
    await run(() => api.hover(false))
    await tick(REVEAL_GRACE_MS * 2)
    expect(api.on).toBe(true)
    await render({ held: false })
    await tick(REVEAL_GRACE_MS * 2)
    expect(api.on).toBe(true)
    await pointer('pointermove')
    await tick(REVEAL_GRACE_MS)
    expect(api.on).toBe(false)
  })

  it('a release under a pointer that returned keeps it open', async () => {
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS)
    await render({ held: true })
    await run(() => api.hover(false))
    await render({ held: false })
    await run(() => api.hover(true))
    await pointer('pointermove')
    await tick(REVEAL_GRACE_MS * 2)
    expect(api.on).toBe(true)
  })

  it('held never opens a closed dwell', async () => {
    await render({ held: true })
    await tick(REVEAL_DWELL_MS * 2)
    expect(api.on).toBe(false)
  })

  it('a press holds off a pending open until release, which dwells fresh', async () => {
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS / 2)
    await pointer('pointerdown')
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS * 2)
    expect(api.on).toBe(false)
    await pointer('pointerup')
    await tick(REVEAL_DWELL_MS)
    expect(api.on).toBe(true)
  })

  it('a secondary press never holds, and a context menu ends a primary one', async () => {
    await pointer('pointerdown', 2)
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS)
    expect(api.on).toBe(true)
    await run(() => api.hover(false))
    await tick(REVEAL_GRACE_MS)
    await pointer('pointerdown')
    await pointer('contextmenu')
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS)
    expect(api.on).toBe(true)
  })

  it('a press inside an open zone keeps it open', async () => {
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS)
    await pointer('pointerdown')
    await tick(REVEAL_GRACE_MS * 2)
    expect(api.on).toBe(true)
  })

  it('a pressed flip of engaged keeps it on, and a flip of active resets it', async () => {
    await run(() => api.press())
    await render({ engaged: true })
    expect(api.on).toBe(true)
    await render({ active: false })
    expect(api.on).toBe(false)
    await render({ active: true })
    expect(api.on).toBe(false)
  })

  it('a flip without a press forgets the pointer and its pending dwell', async () => {
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS / 2)
    await render({ engaged: true })
    await pointer('pointerdown')
    await pointer('pointerup')
    await tick(REVEAL_DWELL_MS * 2)
    expect(api.on).toBe(false)
  })

  it('a press whose flip lands after the pointer has left no longer lingers', async () => {
    await render({ linger: { on: 2000 } })
    await run(() => api.press())
    await run(() => api.hover(false))
    await render({ engaged: true })
    expect(api.on).toBe(false)
  })

  it('under (hover: none) it is on whenever it is active', async () => {
    coarse(true)
    await render()
    expect(api.on).toBe(true)
    await render({ active: false })
    expect(api.on).toBe(false)
  })
})

describe('useHoverReveal without a dwell', () => {
  beforeEach(async () => {
    await render({ dwell: false, engaged: false })
  })

  it('never opens on hover', async () => {
    await run(() => api.hover(true))
    await tick(REVEAL_DWELL_MS * 2)
    expect(api.on).toBe(false)
  })

  it('a numeric linger holds from the press, whenever the pointer leaves', async () => {
    await render({ linger: { on: 2000 } })
    await run(() => api.press())
    await tick(500)
    await render({ engaged: true })
    expect(api.on).toBe(true)
    await run(() => api.hover(false))
    await tick(1499)
    expect(api.on).toBe(true)
    await tick(1)
    expect(api.on).toBe(false)
  })

  it('a numeric linger that ends with the pointer inside keeps the reveal', async () => {
    await render({ linger: { on: 2000 } })
    await run(() => api.press())
    await render({ engaged: true })
    await tick(2000)
    expect(api.on).toBe(true)
  })

  it('a pressed flip to a side with no linger ends a lingering reveal', async () => {
    await render({ linger: { on: 2000 } })
    await run(() => api.press())
    await render({ engaged: true })
    await run(() => api.press())
    await render({ engaged: false })
    expect(api.on).toBe(false)
  })

  it('a leave linger holds until the pointer leaves, then drops at once', async () => {
    await render({ engaged: true, linger: { off: 'leave' } })
    await run(() => api.press())
    await render({ engaged: false })
    await tick(REVEAL_DWELL_MS * 4)
    expect(api.on).toBe(true)
    await run(() => api.hover(false))
    expect(api.on).toBe(false)
  })

  it('a pressed flip to a side with no linger stays off', async () => {
    await render({ linger: { off: 'leave' } })
    await run(() => api.press())
    await render({ engaged: true })
    expect(api.on).toBe(false)
  })

  it('a flip without a press resets the reveal, its hold, and the recorded inside', async () => {
    await render({ linger: { on: 2000 } })
    await run(() => api.press())
    await render({ engaged: true })
    expect(api.on).toBe(true)
    await render({ engaged: false })
    expect(api.on).toBe(false)
    await tick(2000)
    expect(api.on).toBe(false)
  })

  it('stays off under (hover: none)', async () => {
    coarse(true)
    await render()
    expect(api.on).toBe(false)
  })
})

describe('withinReach', () => {
  const at = { left: 100, top: 100, right: 120, bottom: 110 }
  const outward = { x: 1, y: 1 } as const
  const r = REVEAL_REACH.inline

  it('holds a point on its anchor', () => {
    expect(withinReach(at, { size: 'inline', toward: outward }, 110, 105)).toBe(true)
  })

  it('rounds the far corner of an arc', () => {
    expect(withinReach(at, { size: 'inline', toward: outward }, 120 + r, 110)).toBe(true)
    expect(withinReach(at, { size: 'inline', toward: outward }, 120 + r * 0.8, 110 + r * 0.8)).toBe(
      false,
    )
  })

  it('makes an edge reach a band half as deep as it is wide', () => {
    const e = REVEAL_REACH.edge
    const edge = { size: 'edge', toward: { x: -1, y: -1 } } as const
    expect(withinReach(at, edge, 100 - e, 100 - e / 2)).toBe(true)
    expect(withinReach(at, edge, 100 - e, 100 - e / 2 - 1)).toBe(false)
    expect(withinReach(at, edge, 100 - e - 1, 100)).toBe(false)
  })

  it('leaves out a point behind the anchor on either axis', () => {
    expect(withinReach(at, { size: 'corner', toward: outward }, 99, 105)).toBe(false)
    expect(withinReach(at, { size: 'corner', toward: outward }, 110, 99)).toBe(false)
  })

  it('surrounds its anchor without a direction', () => {
    const around = { size: 'inline' } as const
    expect(withinReach(at, around, 100 - r * 0.6, 100 - r * 0.6)).toBe(true)
    expect(withinReach(at, around, 100 - r * 0.8, 100 - r * 0.8)).toBe(false)
    expect(withinReach(at, around, 120 + r, 105)).toBe(true)
  })

  it('scales with its surface', () => {
    expect(withinReach(at, { size: 'inline', toward: outward }, 120 + r * 1.5, 110)).toBe(false)
    expect(withinReach(at, { size: 'inline', toward: outward }, 120 + r * 1.5, 110, 2)).toBe(true)
  })
})

describe('useRevealWithin', () => {
  const r = REVEAL_REACH.inline
  let el: HTMLSpanElement

  function Near(): React.JSX.Element {
    const ref = useRef<HTMLSpanElement>(null)
    useRevealWithin(ref, { size: 'inline' })
    return <span ref={ref} data-reveal-host="off" />
  }

  const move = (x: number, y: number, buttons = 0): Promise<void> =>
    run(() =>
      document.body.dispatchEvent(
        new MouseEvent('pointermove', { clientX: x, clientY: y, buttons, bubbles: true }),
      ),
    )

  beforeEach(async () => {
    await act(async () => root.render(<Near />))
    el = host.querySelector('span') as HTMLSpanElement
    el.getBoundingClientRect = () => ({ left: 100, top: 100, right: 120, bottom: 110 }) as DOMRect
  })

  it('turns its host on within reach and off beyond it', async () => {
    await move(120 + r, 105)
    expect(el.dataset.revealHost).toBe('on')
    await move(120 + r + 1, 105)
    expect(el.dataset.revealHost).toBe('off')
  })

  it('turns off while a button is held', async () => {
    await move(110, 105)
    await move(110, 105, 1)
    expect(el.dataset.revealHost).toBe('off')
  })

  it('turns off when the pointer leaves the window', async () => {
    await move(110, 105)
    await run(() =>
      document.body.dispatchEvent(
        new MouseEvent('pointerout', { relatedTarget: null, bubbles: true }),
      ),
    )
    expect(el.dataset.revealHost).toBe('off')
  })
})

describe('withinBox', () => {
  const at = { left: 100, top: 100, right: 120, bottom: 110 }

  it('holds its edges and its pad, and nothing past them', () => {
    expect(withinBox(at, 120, 110)).toBe(true)
    expect(withinBox(at, 121, 110)).toBe(false)
    expect(withinBox(at, 94, 104, 6)).toBe(true)
    expect(withinBox(at, 93, 104, 6)).toBe(false)
  })
})

describe('trackNear', () => {
  const r = REVEAL_REACH.inline
  let anchor: HTMLElement
  let heard: Nearness[]
  let measured: number
  let stop: () => void
  let forget: () => void

  const fire = (target: EventTarget, type: string, init: MouseEventInit = {}): void => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init }))
  }
  const move = (x: number, buttons = 0, target: EventTarget = document.body): void =>
    fire(target, 'pointermove', { clientX: x, clientY: 105, buttons })

  const track = (scope?: HTMLElement): void => {
    ;({ stop, forget } = trackNear({
      anchor,
      scope,
      measure: () => {
        measured++
        const box = anchor.getBoundingClientRect()
        return (x, y) => withinReach(box, { size: 'inline' }, x, y)
      },
      report: (at) => heard.push(at),
    }))
  }

  beforeEach(() => {
    heard = []
    measured = 0
    anchor = document.createElement('div')
    document.body.appendChild(anchor)
    anchor.getBoundingClientRect = () =>
      ({ left: 100, top: 100, right: 120, bottom: 110 }) as DOMRect
  })
  afterEach(() => {
    stop()
    anchor.remove()
  })

  it('reports every move, near at exactly the reach and far one past it', () => {
    track()
    move(120 + r)
    move(120 + r)
    move(120 + r + 1)
    expect(heard).toEqual(['near', 'near', 'far'])
  })

  it('measures once across moves', () => {
    track()
    move(110)
    move(130)
    move(400)
    expect(measured).toBe(1)
  })

  it('reports held while a button is down, and measures afresh after', () => {
    track()
    move(110)
    move(110, 1)
    move(110)
    expect(heard).toEqual(['near', 'held', 'near'])
    expect(measured).toBe(2)
  })

  it('reports out when the pointer leaves the window', () => {
    track()
    move(110)
    fire(document.body, 'pointerout', { relatedTarget: null })
    expect(heard).toEqual(['near', 'out'])
  })

  it('reports out when the window loses focus', () => {
    track()
    move(110)
    window.dispatchEvent(new Event('blur'))
    move(110)
    expect(heard).toEqual(['near', 'out', 'near'])
    expect(measured).toBe(2)
  })

  it('drops its measure on a resize, a transition on the anchor, an ancestor, or a sibling, and forget', () => {
    const sibling = document.body.appendChild(document.createElement('div'))
    track()
    move(110)
    window.dispatchEvent(new Event('resize'))
    move(110)
    anchor.dispatchEvent(new Event('transitionend', { bubbles: true }))
    move(110)
    document.body.dispatchEvent(new Event('transitionend', { bubbles: true }))
    move(110)
    sibling.dispatchEvent(new Event('transitionend', { bubbles: true }))
    move(110)
    forget()
    move(110)
    sibling.remove()
    expect(measured).toBe(6)
  })

  it('measures afresh after a scroll', () => {
    track()
    move(110)
    window.dispatchEvent(new Event('scroll'))
    move(110)
    expect(measured).toBe(2)
  })

  it('keeps its measure through a transition elsewhere', () => {
    const other = document.createElement('div')
    const inner = document.createElement('span')
    other.appendChild(inner)
    document.body.appendChild(other)
    track()
    move(110)
    inner.dispatchEvent(new Event('transitionend', { bubbles: true }))
    move(110)
    other.remove()
    expect(measured).toBe(1)
  })

  it('in a scope, hears only its moves and leaves only past its edge', () => {
    const scope = document.createElement('div')
    const child = document.createElement('span')
    scope.appendChild(child)
    document.body.appendChild(scope)
    track(scope)
    move(110)
    move(110, 0, child)
    fire(child, 'pointerout', { relatedTarget: scope })
    fire(scope, 'pointerout', { relatedTarget: document.body })
    scope.remove()
    expect(heard).toEqual(['near', 'out'])
  })

  it('stops hearing once stopped', () => {
    track()
    stop()
    move(110)
    expect(heard).toEqual([])
  })
})
