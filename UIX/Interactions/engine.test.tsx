// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  DragGroup,
  placeAxis,
  placeCell,
  SortableZone,
  useDragFamily,
  useDragItem,
  useDropSlot,
  useEscort,
  type Escort,
} from './engine'
import { firePointer, pressEscape, stubPointerCapture, stubRect } from './pointerHarness'
import { DEFAULT_FEEL } from '../Animations/feel'
import { type Box, SETTLE_FALLBACK } from './shared'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
stubPointerCapture()

// An empty zone above two banded zones of 200px, an empty one below them, a wide one, a family-less one, and a 3-tab row of 200/120/120 at y 1000; each card a 100px row.
const ZONES: Record<string, string[]> = {
  E: [],
  A: ['a1', 'a2'],
  B: ['b1'],
  C: [],
  D: ['d1'],
  F: ['f1'],
  X: ['x1', 'x2', 'x3'],
}
const BAND: Record<string, number> = { E: -200, A: 0, B: 200, C: 400, D: 600, F: 800, X: 1000 }
const TAB_W = [200, 120, 120]

let commitSpy: ReturnType<typeof vi.fn<(activeId: string, zone: string, index: number) => void>>
let fromSpy: ReturnType<typeof vi.fn<(from: string) => void>>
let reorderSpy: ReturnType<typeof vi.fn<(activeId: string, overId: string) => void>>
let receiveSpy: ReturnType<typeof vi.fn<(item: unknown, index: number) => void>>
let resolve: (zoneId: string, index: number, activeId: string) => number | null
let withOverlay = false
let zoneOverlay = false
let stray: 'stick' | 'return' = 'stick'
let holdGap = false
let carryA: ((id: string) => unknown) | undefined
let hidden = new Set<string>()
let escortRef: Escort | null = null

function Item({ id }: { id: string }): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return <div ref={setNodeRef} data-id={id} style={style} {...handle} />
}

function Slot(): React.JSX.Element | null {
  const slot = useDropSlot()
  return slot ? (
    <i
      data-slot
      style={{ top: slot.top, left: slot.left, width: slot.width, height: slot.height }}
    />
  ) : null
}

function Probe(): React.JSX.Element {
  escortRef = useEscort()
  return <b data-family={useDragFamily() ?? ''} />
}

function Board(): React.JSX.Element {
  return (
    <DragGroup
      stray={stray}
      holdGap={holdGap}
      onCommit={(activeId, zone, index, from) => {
        commitSpy(activeId, zone, index)
        fromSpy(from)
      }}
      resolveIndex={(zone, index, activeId) => resolve(zone, index, activeId)}
      renderOverlay={withOverlay ? (activeId) => <span data-overlay={activeId} /> : undefined}
    >
      {Object.entries(ZONES)
        .filter(([zid]) => !hidden.has(zid))
        .map(([zid, ids]) => (
          <SortableZone
            key={zid}
            id={zid}
            items={ids}
            className={`zone-${zid}`}
            family={zid === 'F' ? undefined : 'board'}
            axis={zid === 'X' ? 'x' : undefined}
            carry={zid === 'A' ? carryA : undefined}
            receive={zid === 'B' ? (item, index) => receiveSpy(item, index) : undefined}
            renderOverlay={
              zoneOverlay && zid === 'A' ? (id) => <span data-zone-overlay={id} /> : undefined
            }
            onReorder={(activeId, overId) => reorderSpy(activeId, overId)}
          >
            {ids.map((id) => (
              <Item key={id} id={id} />
            ))}
          </SortableZone>
        ))}
      <Slot />
      <Probe />
    </DragGroup>
  )
}

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  commitSpy = vi.fn()
  fromSpy = vi.fn()
  reorderSpy = vi.fn()
  receiveSpy = vi.fn()
  resolve = (_zone, index) => index
  withOverlay = false
  zoneOverlay = false
  stray = 'stick'
  holdGap = false
  carryA = undefined
  hidden = new Set()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await mount()
})

const mount = async (): Promise<void> => {
  await act(async () => root.render(<Board />))
  for (const [zid, ids] of Object.entries(ZONES)) {
    if (hidden.has(zid)) continue
    const top = BAND[zid]
    const wide = zid === 'D' || zid === 'X'
    stubRect(host.querySelector(`.zone-${zid}`) as Element, {
      top,
      bottom: top + (zid === 'X' ? 100 : 200),
      right: wide ? 1000 : 200,
    })
    ids.forEach((id, i) => {
      const el = host.querySelector(`.zone-${zid} [data-id="${id}"]`) as Element
      if (zid === 'X') {
        const left = TAB_W.slice(0, i).reduce((a, b) => a + b, 0)
        stubRect(el, { top, bottom: top + 100, left, right: left + TAB_W[i] })
      } else stubRect(el, { top: top + i * 100, bottom: top + i * 100 + 100, left: 0, right: 200 })
    })
  }
}

afterEach(() => {
  pressEscape()
  act(() => root.unmount())
  host.remove()
})

const item = (id: string): HTMLElement => host.querySelector(`[data-id="${id}"]`) as HTMLElement

const dragHold = async (id: string, x: number, y: number): Promise<void> => {
  const r = item(id).getBoundingClientRect()
  await act(async () => {
    firePointer(item(id), 'pointerdown', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x, y })
  })
}

const release = async (x: number, y: number): Promise<void> => {
  await act(async () => {
    firePointer(window, 'pointerup', { x, y })
  })
}

const dragTo = async (id: string, x: number, y: number): Promise<void> => {
  await dragHold(id, x, y)
  await release(x, y)
}

const settle = (): Promise<void> =>
  act(async () => {
    await new Promise((r) => setTimeout(r, DEFAULT_FEEL.duration + SETTLE_FALLBACK + 20))
  })

const dropAt = async (id: string, x: number, y: number): Promise<void> => {
  await dragTo(id, x, y)
  await settle()
}

describe('the drag engine across zones', () => {
  it('reorders within the source zone and reports the slot it landed on', async () => {
    await dropAt('a1', 100, 150)
    expect(reorderSpy).toHaveBeenCalledExactlyOnceWith('a1', 'a2')
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'A', 1)
  })

  it('writes nothing when the item is dropped back on its own slot', async () => {
    await dropAt('a1', 100, 60)
    expect(reorderSpy).not.toHaveBeenCalled()
    expect(commitSpy).not.toHaveBeenCalled()
  })

  it('drops before an item in a foreign zone', async () => {
    await dropAt('a1', 100, 210)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'B', 0)
    expect(reorderSpy).not.toHaveBeenCalled()
  })

  it('appends past the last item of a foreign zone', async () => {
    await dropAt('a1', 100, 358)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'B', 1)
  })

  it('appends to the right of the last card in a wide foreign row', async () => {
    await dropAt('a1', 300, 650)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'D', 1)
  })

  it('appends past the last card of a full foreign row', async () => {
    const r = item('a1').getBoundingClientRect()
    await act(async () => {
      firePointer(item('a1'), 'pointerdown', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 100, y: 250 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 300, y: 250 })
    })
    await act(async () => {
      firePointer(window, 'pointerup', { x: 300, y: 250 })
    })
    await settle()
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'B', 1)
  })

  it('sizes the landing slot to the cell it lands in and floors every zone to the lifted height while in flight', async () => {
    stubRect(item('b1'), { top: 200, bottom: 350, left: 0, right: 200 })
    const r = item('a1').getBoundingClientRect()
    await act(async () => {
      firePointer(item('a1'), 'pointerdown', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 100, y: 210 })
    })
    const slot = host.querySelector('[data-slot]') as HTMLElement
    expect(slot.style.height).toBe('150px')
    const floorOf = (): string =>
      (host.querySelector('.zone-C') as HTMLElement).style.getPropertyValue('--drag-floor')
    expect(floorOf()).toBe('100.0px')
    await act(async () => {
      firePointer(window, 'pointerup', { x: 100, y: 210 })
    })
    await settle()
    expect(floorOf()).toBe('')
  })

  it('re-reads the landing once the floors of empty zones have grown on lift', async () => {
    // Zone A sits under E, so A's rects move down by E's floor once a drag is in flight.
    const grown = (): number =>
      parseFloat(
        (host.querySelector('.zone-E') as HTMLElement).style.getPropertyValue('--drag-floor'),
      ) || 0
    const shifted = (el: Element, top: number, bottom: number): void => {
      el.getBoundingClientRect = () => {
        const dy = grown()
        return {
          top: top + dy,
          bottom: bottom + dy,
          left: 0,
          right: 200,
          width: 200,
          height: bottom - top,
        } as DOMRect
      }
    }
    shifted(host.querySelector('.zone-A') as Element, 0, 200)
    shifted(item('a1'), 0, 100)
    shifted(item('a2'), 100, 200)
    await act(async () => {
      firePointer(item('a1'), 'pointerdown', { x: 100, y: 50 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 100, y: 250 })
    })
    const slot = host.querySelector('[data-slot]') as HTMLElement
    expect(slot.style.top).toBe('200px')
    pressEscape()
  })

  it('lands at index 0 in an empty zone', async () => {
    await dropAt('a1', 100, 450)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'C', 0)
  })

  it('snaps back and commits nothing when the landing is refused', async () => {
    resolve = (zone, index) => (zone === 'B' ? null : index)
    await dropAt('a1', 100, 210)
    expect(commitSpy).not.toHaveBeenCalled()
    expect(reorderSpy).not.toHaveBeenCalled()
  })

  it('glides the overlay to the landing cell, not to the release point', async () => {
    withOverlay = true
    await mount()
    await dragTo('a1', 100, 130)
    const overlay = document.querySelector('[data-overlay="a1"]')?.parentElement as HTMLElement
    expect(overlay.style.transform).toBe('translate3d(0.0px, 100.0px, 0)')
    await settle()
  })

  it('keeps the keyboard lift off the keypress that lifted it', async () => {
    await act(async () => {
      item('a1').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })
    await settle()
    expect(reorderSpy).toHaveBeenCalledExactlyOnceWith('a1', 'a2')
  })

  it('marks a disabled zone on its items from the first render', async () => {
    const box = document.createElement('div')
    document.body.appendChild(box)
    const local = createRoot(box)
    await act(async () =>
      local.render(
        <SortableZone items={['a', 'b']} disabled>
          <Item id="a" />
          <Item id="b" />
        </SortableZone>,
      ),
    )
    const handle = box.querySelector('[data-id="a"]') as HTMLElement
    expect(handle.getAttribute('tabindex')).toBe('-1')
    expect(handle.getAttribute('aria-disabled')).toBe('true')
    act(() => local.unmount())
    box.remove()
  })

  it('holds the commit until the drop animation settles', async () => {
    await dragTo('a1', 100, 150)
    expect(commitSpy).not.toHaveBeenCalled()
    await settle()
    expect(commitSpy).toHaveBeenCalledOnce()
  })
})

// A column of uniform 10px-tall slots at y = 0,10,20,...
const column = (n: number): Box[] =>
  Array.from({ length: n }, (_, i) => ({
    left: 0,
    top: i * 10,
    width: 100,
    height: 10,
    cx: 50,
    cy: i * 10 + 5,
  }))

// A `cols`-wide grid of 100px cells.
const grid = (count: number, cols: number): Box[] =>
  Array.from({ length: count }, (_, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    return {
      left: c * 100,
      top: r * 100,
      width: 100,
      height: 100,
      cx: c * 100 + 50,
      cy: r * 100 + 50,
    }
  })

const cellIn = (rects: Box[], over: number, activeIdx: number, index: number): { y: number } =>
  placeCell(rects, activeIdx, over, index, 10, 100)

describe('placeCell — the displacement core', () => {
  it('shifts the passed-over items up when dragging forward', () => {
    const r = column(4)
    expect(cellIn(r, 2, 0, 1).y).toBe(0)
    expect(cellIn(r, 2, 0, 2).y).toBe(10)
    expect(cellIn(r, 2, 0, 3).y).toBe(30)
  })

  it('shifts the passed-over items down when dragging backward', () => {
    const r = column(4)
    expect(cellIn(r, 1, 3, 0).y).toBe(0)
    expect(cellIn(r, 1, 3, 1).y).toBe(20)
    expect(cellIn(r, 1, 3, 2).y).toBe(30)
  })

  it('is a no-op when over === active (hovering its own slot)', () => {
    const r = column(4)
    for (let i = 0; i < 4; i++) expect(cellIn(r, 1, 1, i).y).toBe(i * 10)
  })

  it('closes the gap when the active item is in another zone', () => {
    const r = column(4)
    expect(cellIn(r, -1, 1, 0).y).toBe(0)
    expect(cellIn(r, -1, 1, 2).y).toBe(10)
    expect(cellIn(r, -1, 1, 3).y).toBe(20)
  })

  it('opens a slot for a foreign item, and walks the grid past the last cell', () => {
    const g = grid(4, 2)
    expect(placeCell(g, -1, 0, 0, 100, 200)).toEqual({ x: 100, y: 0 })
    expect(placeCell(g, -1, 4, 3, 100, 200)).toEqual({ x: 100, y: 100 })
    expect(placeCell(g, -1, 0, 3, 100, 200)).toEqual({ x: 0, y: 200 })
  })
})

describe('the drag engine across a family', () => {
  it('keeps an item home when its zone has no family', async () => {
    await dropAt('f1', 100, 210)
    expect(commitSpy).not.toHaveBeenCalled()
    expect(receiveSpy).not.toHaveBeenCalled()
  })

  it('keeps an item home when carry declines it', async () => {
    carryA = () => null
    await mount()
    await dropAt('a1', 100, 210)
    expect(receiveSpy).not.toHaveBeenCalled()
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'A', 1)
  })

  it('returns to its slot when released over nothing', async () => {
    stray = 'return'
    await mount()
    await dropAt('a1', 300, 250)
    expect(commitSpy).not.toHaveBeenCalled()
    expect(reorderSpy).not.toHaveBeenCalled()
  })

  it('holds the source gap open while the landing is foreign', async () => {
    holdGap = true
    await mount()
    await dragTo('a1', 100, 210)
    expect(item('a2').style.transform).toBe('translate3d(0.0px, 0.0px, 0)')
    await settle()
  })

  it('closes the source gap without holdGap', async () => {
    await dragTo('a1', 100, 210)
    expect(item('a2').style.transform).toBe('translate3d(0.0px, -100.0px, 0)')
    await settle()
  })

  it('hands the carried item to the zone it lands in', async () => {
    carryA = (id) => ({ id, from: 'A' })
    await mount()
    await dropAt('a1', 100, 210)
    expect(receiveSpy).toHaveBeenCalledExactlyOnceWith({ id: 'a1', from: 'A' }, 0)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'B', 0)
    expect(fromSpy).toHaveBeenCalledExactlyOnceWith('A')
  })

  it('still receives when the landing zone unmounts during the drop animation', async () => {
    await dragTo('a1', 100, 210)
    hidden = new Set(['B'])
    await act(async () => root.render(<Board />))
    await settle()
    expect(receiveSpy).toHaveBeenCalledExactlyOnceWith('a1', 0)
  })

  it('marks only the lifted zone item as dragging when two zones share an id', async () => {
    ZONES.D = ['d1', 'a1']
    await mount()
    const twins = host.querySelectorAll('[data-id="a1"]')
    const r = twins[0].getBoundingClientRect()
    await act(async () => {
      firePointer(twins[0], 'pointerdown', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 100, y: 150 })
    })
    expect(twins[0].getAttribute('aria-pressed')).toBe('true')
    expect(twins[1].getAttribute('aria-pressed')).toBeNull()
    pressEscape()
    ZONES.D = ['d1']
  })

  it('reports the family once the item is loose and nothing after', async () => {
    await dragTo('a1', 100, 150)
    expect(host.querySelector('[data-family]')?.getAttribute('data-family')).toBe('')
    await settle()
    await dragTo('a1', 100, 210)
    expect(host.querySelector('[data-family]')?.getAttribute('data-family')).toBe('board')
    await settle()
    expect(host.querySelector('[data-family]')?.getAttribute('data-family')).toBe('')
  })

  it('uses the zone overlay over the group overlay', async () => {
    withOverlay = true
    zoneOverlay = true
    await mount()
    await dragTo('a1', 100, 130)
    expect(document.querySelector('[data-zone-overlay="a1"]')).not.toBeNull()
    expect(document.querySelector('[data-overlay="a1"]')).toBeNull()
    await settle()
  })

  it('parts an axis row by the width of the item coming in', async () => {
    await dragHold('x1', 260, 1050)
    expect(item('x2').style.transform).toBe('translate3d(-200.0px, 0.0px, 0)')
    const slot = host.querySelector('[data-slot]') as HTMLElement
    expect(slot.style.left).toBe('120px')
    await release(260, 1050)
    await settle()
  })

  it('keeps an axis row item in its row when it overshoots the row end', async () => {
    stray = 'return'
    await mount()
    await dropAt('x1', 900, 1050)
    expect(reorderSpy).toHaveBeenCalledExactlyOnceWith('x1', 'x3')
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('x1', 'X', 2)
  })

  it('lands a foreign item past the last item of an axis row at the row own size', async () => {
    await dragHold('a1', 500, 1050)
    const slot = host.querySelector('[data-slot]') as HTMLElement
    expect(slot.style.left).toBe('440px')
    expect(slot.style.width).toBe('120px')
    await release(500, 1050)
    await settle()
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'X', 3)
  })

  it('escorts a foreign row into a zone and lands nowhere outside every zone', async () => {
    const rect: Box = { left: 0, top: -1000, width: 200, height: 24, cx: 100, cy: -988 }
    const spec = { id: 'row', family: 'board', item: { id: 'row' }, rect, home: rect }
    await act(async () => {
      escortRef?.lift(spec)
    })
    await act(async () => escortRef?.move(100, 210))
    expect(escortRef?.loose()).toBe(true)
    let landed = false
    await act(async () => {
      landed = escortRef?.drop() ?? false
    })
    expect(landed).toBe(true)
    expect(receiveSpy).toHaveBeenCalledExactlyOnceWith({ id: 'row' }, 0)
    await act(async () => {
      escortRef?.lift(spec)
    })
    await act(async () => escortRef?.move(100, 210))
    await act(async () => escortRef?.move(100, -990))
    await act(async () => {
      landed = escortRef?.drop() ?? false
    })
    expect(landed).toBe(false)
    expect(receiveSpy).toHaveBeenCalledOnce()
    stray = 'return'
    await mount()
    await act(async () => {
      escortRef?.lift(spec)
    })
    await act(async () => escortRef?.move(300, 250))
    await act(async () => {
      landed = escortRef?.drop() ?? false
    })
    expect(landed).toBe(false)
  })
})

describe('placeAxis — the running-offset core', () => {
  const row: Box[] = [
    { left: 0, top: 0, width: 200, height: 30, cx: 100, cy: 15 },
    { left: 200, top: 0, width: 120, height: 30, cx: 260, cy: 15 },
    { left: 320, top: 0, width: 120, height: 30, cx: 380, cy: 15 },
  ]
  it('moves the passed-over item back by the lifted width', () => {
    expect(placeAxis(row, 'x', 0, { x: 0, y: 0 }, 0, 1, 1, 200)).toEqual({ x: 0, y: 0 })
    expect(placeAxis(row, 'x', 0, { x: 0, y: 0 }, 0, 1, 0, 200)).toEqual({ x: 120, y: 0 })
  })
  it('opens a slot the size of a foreign item', () => {
    expect(placeAxis(row, 'x', 4, { x: 0, y: 0 }, -1, 1, 1, 80)).toEqual({ x: 288, y: 0 })
    expect(placeAxis(row, 'x', 4, { x: 0, y: 0 }, -1, 1, -1, 80)).toEqual({ x: 204, y: 0 })
  })
})
