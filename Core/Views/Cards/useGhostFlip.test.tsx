// @vitest-environment jsdom
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGhostFlip } from './useGhostFlip'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
;(globalThis as { CSS?: unknown }).CSS ??= { escape: (s: string) => s }

type Spot = { left: number; top: number }
type Layout = Record<string, Spot>

const at = (left: number, top: number): Spot => ({ left, top })
const REST: Layout = {
  b1: at(0, 0),
  g1: at(0, 10),
  c1: at(0, 10),
  c2: at(100, 10),
  b2: at(0, 200),
  g2: at(0, 210),
  c3: at(0, 210),
}
const LIFTED: Layout = {
  b1: at(0, 30),
  g1: at(0, 40),
  c1: at(0, 40),
  c2: at(200, 40),
  b2: at(0, 250),
  g2: at(0, 260),
  c3: at(0, 260),
}

let flat = false
let shownLayout: Layout
let reads: number
let animate: ReturnType<typeof vi.fn<(keyframes: unknown, options: unknown) => void>>
let animated: { key: string; transform: string }[]
let host: HTMLDivElement
let root: Root

const measured = (key: string) => (el: HTMLElement | null) => {
  if (!el) return
  el.getBoundingClientRect = () => {
    reads++
    const { left, top } = shownLayout[key]
    return { left, top, right: left + 100, bottom: top + 100, width: 100, height: 100 } as DOMRect
  }
  el.dataset.key = key
}

function Board({ liveId, gone }: { liveId: string | null; gone: boolean }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useGhostFlip(ref, liveId, gone, 1)
  shownLayout = shown === null || flat ? REST : LIFTED
  return (
    <div ref={ref}>
      <div className="group-band" ref={measured('b1')}>
        <div className="cards-grid" ref={measured('g1')}>
          <div className="card-displace" data-rid="c1" ref={measured('c1')} />
          <div className="card-displace" data-rid="c2" ref={measured('c2')} />
        </div>
      </div>
      <div className="group-band" ref={measured('b2')}>
        <div className="cards-grid" ref={measured('g2')}>
          <div className="card-displace" data-rid="c3" ref={measured('c3')} />
        </div>
      </div>
    </div>
  )
}

const render = (liveId: string | null, gone = false): Promise<void> =>
  act(async () => root.render(<Board liveId={liveId} gone={gone} />))

beforeEach(async () => {
  flat = false
  reads = 0
  animated = []
  animate = vi.fn()
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: function (this: HTMLElement, keyframes: { transform: string }[], options: unknown) {
      animated.push({ key: this.dataset.key ?? '', transform: keyframes[0].transform })
      animate(keyframes, options)
    },
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await render(null)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  Reflect.deleteProperty(Element.prototype, 'animate')
})

describe('useGhostFlip', () => {
  it("animates a card by its move within its own grid, not the band's move around it", async () => {
    await render('c1')
    expect(animated.find((a) => a.key === 'c2')?.transform).toBe('translate(-100px, 0px)')
    expect(animated.some((a) => a.key === 'c1' || a.key === 'c3')).toBe(false)
  })

  it('animates each band by its own vertical move', async () => {
    await render('c1')
    expect(animated.find((a) => a.key === 'b1')?.transform).toBe('translate(0px, -30px)')
    expect(animated.find((a) => a.key === 'b2')?.transform).toBe('translate(0px, -50px)')
  })

  it('measures nothing when the ghost is gone', async () => {
    reads = 0
    await render('c1', true)
    expect(reads).toBe(0)
    expect(animate).not.toHaveBeenCalled()
  })

  it('animates nothing whose seat did not change', async () => {
    flat = true
    await render('c1')
    expect(animate).not.toHaveBeenCalled()
  })
})
