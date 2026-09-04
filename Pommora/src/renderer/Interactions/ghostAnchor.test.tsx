// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { type GhostAnchor, useGhostAnchor } from '@renderer/Interactions/ghostAnchor'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const DWELL = 1000
const GRACE = 100

let api: GhostAnchor
let suppressed = false

function Probe(): React.JSX.Element {
  api = useGhostAnchor({ dwellMs: DWELL, graceMs: GRACE, suppressed: () => suppressed })
  return api.ghost ? <div data-ghost-root data-closing={api.ghost.closing} /> : <span />
}

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  vi.useFakeTimers()
  suppressed = false
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(<Probe />))
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

const tick = async (ms: number): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

/** The standing-ghost preamble: hover the anchor and let its dwell fire. */
const dwellOpen = async (id: string): Promise<void> => {
  await act(async () => api.onHover(id, true))
  await tick(DWELL)
}

describe('useGhostAnchor', () => {
  it('dwell arms the ghost on the hovered anchor', async () => {
    await act(async () => api.onHover('a', true))
    expect(api.ghost).toBeNull()
    await tick(DWELL)
    expect(api.ghost).toEqual({ anchorId: 'a', closing: false })
  })

  it('a leave closes on the grace beat; entering the ghost keeps it', async () => {
    await dwellOpen('a')
    await act(async () => api.onHover('a', false))
    await act(async () => api.onGhostEnter())
    await tick(GRACE * 2)
    expect(api.ghost).toEqual({ anchorId: 'a', closing: false })
    await act(async () => api.onGhostLeave())
    await tick(GRACE)
    expect(api.ghost).toEqual({ anchorId: 'a', closing: true })
    await act(async () => api.closed())
    expect(api.ghost).toBeNull()
  })

  it('returning to the anchor mid-exit reverses the collapse without a new dwell', async () => {
    await dwellOpen('a')
    await act(async () => api.onHover('a', false))
    await tick(GRACE)
    expect(api.ghost?.closing).toBe(true)
    await act(async () => api.onHover('a', true))
    expect(api.ghost).toEqual({ anchorId: 'a', closing: false })
  })

  it('a suppressor arriving mid-dwell cancels the pending open', async () => {
    await act(async () => api.onHover('a', true))
    await tick(DWELL / 2)
    suppressed = true
    await tick(DWELL)
    expect(api.ghost).toBeNull()
  })

  it('a menu pop stands the ghost down and holds new dwells until it resolves', async () => {
    await dwellOpen('a')
    let release: () => void = () => {}
    const menu = new Promise<void>((r) => {
      release = r
    })
    let settled = false
    await act(async () => {
      void api
        .suppressWrap(() => menu)
        .then(() => {
          settled = true
        })
    })
    expect(api.ghost?.closing).toBe(true)
    await act(async () => api.onHover('b', true))
    await tick(DWELL)
    expect(api.ghost?.anchorId).not.toBe('b')
    await act(async () => {
      release()
      await menu
    })
    expect(settled).toBe(true)
  })

  it('a pointerdown outside the ghost clears it synchronously, no exit', async () => {
    await dwellOpen('a')
    await act(async () => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })
    expect(api.ghost).toBeNull()
  })

  it("a pointerdown inside the ghost's root survives — its click is the create", async () => {
    await dwellOpen('a')
    const ghostEl = host.querySelector('[data-ghost-root]') as HTMLElement
    await act(async () => {
      ghostEl.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })
    expect(api.ghost).toEqual({ anchorId: 'a', closing: false })
  })

  it('anchor loss clears state, not just render — no dwell-free reopen', async () => {
    await dwellOpen('a')
    await act(async () => api.onHover('a', false))
    await tick(GRACE)
    expect(api.ghost?.closing).toBe(true)
    // The pipeline dropped the anchor mid-close; the consumer clears by id.
    await act(async () => api.clear('a'))
    expect(api.ghost).toBeNull()
    // Re-hovering must re-dwell — the stranded-closing skip-dwell regression.
    await act(async () => api.onHover('a', true))
    expect(api.ghost).toBeNull()
    await tick(DWELL)
    expect(api.ghost).toEqual({ anchorId: 'a', closing: false })
  })

  it('take() claims the anchor and unmounts in one act', async () => {
    await dwellOpen('a')
    let taken: string | null = null
    await act(async () => {
      taken = api.take()
    })
    expect(taken).toBe('a')
    expect(api.ghost).toBeNull()
    await act(async () => {
      expect(api.take()).toBeNull()
    })
  })

  it('hovering a different row closes the standing ghost and dwells fresh', async () => {
    await dwellOpen('a')
    await act(async () => api.onHover('b', true))
    expect(api.ghost).toEqual({ anchorId: 'a', closing: true })
    await act(async () => api.closed())
    await tick(DWELL)
    expect(api.ghost).toEqual({ anchorId: 'b', closing: false })
  })

  it("take() kills every armed timer — a crossed row's dwell never fires post-create", async () => {
    await dwellOpen('a')
    // Crossing row b toward the ghost arms b's dwell; the ghost click takes before it fires.
    await act(async () => api.onHover('b', true))
    await act(async () => {
      expect(api.take()).toBe('a')
    })
    await tick(DWELL * 2)
    expect(api.ghost).toBeNull()
  })

  it('a closing ghost whose exit never reports self-heals on the watchdog beat', async () => {
    await dwellOpen('a')
    await act(async () => api.onHover('a', false))
    await tick(GRACE)
    expect(api.ghost?.closing).toBe(true)
    // No closed() arrives — the consumer's exit motion unmounted behind a gate.
    await tick(1000)
    expect(api.ghost).toBeNull()
    await act(async () => api.onHover('a', true))
    expect(api.ghost).toBeNull()
    await tick(DWELL)
    expect(api.ghost).toEqual({ anchorId: 'a', closing: false })
  })

  it('overlapping menu pops keep dwells held until the LAST one resolves', async () => {
    const releases: Array<() => void> = []
    const pop = (): Promise<void> =>
      new Promise<void>((r) => {
        releases.push(r)
      })
    await act(async () => {
      void api.suppressWrap(pop)
      void api.suppressWrap(pop)
    })
    await act(async () => {
      releases[0]()
      await Promise.resolve()
    })
    await act(async () => api.onHover('b', true))
    await tick(DWELL)
    expect(api.ghost).toBeNull()
    await act(async () => {
      releases[1]()
      await Promise.resolve()
    })
    await act(async () => api.onHover('b', true))
    await tick(DWELL)
    expect(api.ghost).toEqual({ anchorId: 'b', closing: false })
  })
})

describe('useGhostAnchor travel hold', () => {
  let inZone = new Set<string>()

  function HoldProbe(): React.JSX.Element {
    api = useGhostAnchor({
      dwellMs: DWELL,
      graceMs: GRACE,
      suppressed: () => suppressed,
      travelHold: { inZone: (id) => inZone.has(id), holdMs: 500 },
    })
    return api.ghost ? <div data-ghost-root data-closing={api.ghost.closing} /> : <span />
  }

  beforeEach(async () => {
    inZone = new Set()
    await act(async () => root.render(<HoldProbe />))
  })

  it('entering a zone anchor holds the ghost instead of closing it', async () => {
    inZone.add('b')
    await dwellOpen('a')
    await act(async () => api.onHover('b', true))
    expect(api.ghost).toEqual({ anchorId: 'a', closing: false })
  })

  it("the hold expiring closes the ghost and arms the rested anchor's own dwell", async () => {
    inZone.add('b')
    await dwellOpen('a')
    await act(async () => api.onHover('b', true))
    await tick(500)
    expect(api.ghost).toEqual({ anchorId: 'a', closing: true })
    await act(async () => api.closed())
    await tick(DWELL)
    // No re-enter happened — the pointer never moved — yet b earns its ghost by resting.
    expect(api.ghost).toEqual({ anchorId: 'b', closing: false })
  })

  it('an out-of-zone anchor still closes the ghost immediately', async () => {
    await dwellOpen('a')
    await act(async () => api.onHover('b', true))
    expect(api.ghost).toEqual({ anchorId: 'a', closing: true })
  })
})
