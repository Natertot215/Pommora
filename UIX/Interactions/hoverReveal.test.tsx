// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  type Linger,
  REVEAL_DWELL_MS,
  REVEAL_GRACE_MS,
  REVEAL_REACH,
  useHoverReveal,
  withinReach,
} from './hoverReveal'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Props = {
  active?: boolean
  dwell?: boolean
  held?: boolean
  engaged?: boolean
  linger?: { on?: Linger; off?: Linger }
}

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
    await tick(REVEAL_DWELL_MS * 2)
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
    await render({ engaged: true })
    expect(api.on).toBe(true)
    await run(() => api.hover(false))
    await tick(1999)
    expect(api.on).toBe(true)
    await tick(1)
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

  it('scales with its surface', () => {
    expect(withinReach(at, { size: 'inline', toward: outward }, 120 + r * 1.5, 110)).toBe(false)
    expect(withinReach(at, { size: 'inline', toward: outward }, 120 + r * 1.5, 110, 2)).toBe(true)
  })
})
