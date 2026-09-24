// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { GHOST_DWELL_MS } from './ghostCreate'
import { useHoverDwell } from './hoverDwell'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const GRACE = 150

let api: ReturnType<typeof useHoverDwell>
let props = { active: true, held: false }

function Probe(p: { active: boolean; held: boolean }): React.JSX.Element {
  api = useHoverDwell(p.active, p.held, GRACE)
  return <span />
}

let host: HTMLDivElement
let root: Root

const render = async (next: Partial<typeof props> = {}): Promise<void> => {
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

beforeEach(async () => {
  vi.useFakeTimers()
  props = { active: true, held: false }
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

describe('useHoverDwell', () => {
  it('opens after the dwell and closes after the grace', async () => {
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS - 1)
    expect(api.on).toBe(false)
    await tick(1)
    expect(api.on).toBe(true)
    await run(() => api.hover(false))
    await tick(GRACE)
    expect(api.on).toBe(false)
  })

  it('re-entering within the grace keeps it open', async () => {
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS)
    await run(() => api.hover(false))
    await run(() => api.hover(true))
    await tick(GRACE * 2)
    expect(api.on).toBe(true)
  })

  it('repeated hovers inside the zone never restart the dwell', async () => {
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS / 2)
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS / 2)
    expect(api.on).toBe(true)
  })

  it('held sustains an open dwell past a leave, then closes on release', async () => {
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS)
    await render({ held: true })
    await run(() => api.hover(false))
    await tick(GRACE * 2)
    expect(api.on).toBe(true)
    await render({ held: false })
    await tick(GRACE * 2)
    expect(api.on).toBe(true)
    await pointer('pointermove')
    await tick(GRACE)
    expect(api.on).toBe(false)
  })

  it('a release under a pointer that returned keeps it open', async () => {
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS)
    await render({ held: true })
    await run(() => api.hover(false))
    await render({ held: false })
    await run(() => api.hover(true))
    await pointer('pointermove')
    await tick(GRACE * 2)
    expect(api.on).toBe(true)
  })

  it('held never opens a closed dwell', async () => {
    await render({ held: true })
    await tick(GHOST_DWELL_MS * 2)
    expect(api.on).toBe(false)
  })

  it('a press holds off a pending open until release, which dwells fresh', async () => {
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS / 2)
    await pointer('pointerdown')
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS * 2)
    expect(api.on).toBe(false)
    await pointer('pointerup')
    await tick(GHOST_DWELL_MS)
    expect(api.on).toBe(true)
  })

  it('a secondary press never holds, and a context menu ends a primary one', async () => {
    await pointer('pointerdown', 2)
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS)
    expect(api.on).toBe(true)
    await run(() => api.hover(false))
    await tick(GRACE)
    await pointer('pointerdown')
    await pointer('contextmenu')
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS)
    expect(api.on).toBe(true)
  })

  it('a press inside an open zone keeps it open', async () => {
    await run(() => api.hover(true))
    await tick(GHOST_DWELL_MS)
    await pointer('pointerdown')
    await tick(GRACE * 2)
    expect(api.on).toBe(true)
  })

  it('enter opens at once, and a flip of active resets before it can run', async () => {
    await run(() => api.enter())
    expect(api.on).toBe(true)
    await render({ active: false })
    expect(api.on).toBe(false)
    await render({ active: true })
    expect(api.on).toBe(false)
  })
})
