// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DragGroup, placeCell, SortableZone, useDragItem, useDropSlot } from './engine'
import { firePointer, pressEscape, stubPointerCapture, stubRect } from './pointerHarness'
import { DEFAULT_FEEL } from '../Animations/feel'
import { type Box, SETTLE_FALLBACK } from './shared'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
stubPointerCapture()

// An empty zone above two banded zones of 200px, an empty one below them, and a wide one; each card a 100px row.
const ZONES: Record<string, string[]> = { E: [], A: ['a1', 'a2'], B: ['b1'], C: [], D: ['d1'] }
const BAND: Record<string, number> = { E: -200, A: 0, B: 200, C: 400, D: 600 }

let commitSpy: ReturnType<typeof vi.fn<(activeId: string, zone: string, index: number) => void>>
let reorderSpy: ReturnType<typeof vi.fn<(activeId: string, overId: string) => void>>
let resolve: (zoneId: string, index: number, activeId: string) => number | null
let withOverlay = false

function Item({ id }: { id: string }): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return <div ref={setNodeRef} data-id={id} style={style} {...handle} />
}

function Slot(): React.JSX.Element | null {
  const slot = useDropSlot()
  return slot ? (
    <i data-slot style={{ top: slot.top, width: slot.width, height: slot.height }} />
  ) : null
}

function Board(): React.JSX.Element {
  return (
    <DragGroup
      crossZone
      onCommit={(activeId, zone, index) => commitSpy(activeId, zone, index)}
      resolveIndex={(zone, index, activeId) => resolve(zone, index, activeId)}
      renderOverlay={withOverlay ? (activeId) => <span data-overlay={activeId} /> : undefined}
    >
      {Object.entries(ZONES).map(([zid, ids]) => (
        <SortableZone
          key={zid}
          id={zid}
          items={ids}
          className={`zone-${zid}`}
          onReorder={(activeId, overId) => reorderSpy(activeId, overId)}
        >
          {ids.map((id) => (
            <Item key={id} id={id} />
          ))}
        </SortableZone>
      ))}
      <Slot />
    </DragGroup>
  )
}

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  commitSpy = vi.fn()
  reorderSpy = vi.fn()
  resolve = (_zone, index) => index
  withOverlay = false
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await mount()
})

const mount = async (): Promise<void> => {
  await act(async () => root.render(<Board />))
  for (const [zid, ids] of Object.entries(ZONES)) {
    const top = BAND[zid]
    const wide = zid === 'D'
    stubRect(host.querySelector(`.zone-${zid}`) as Element, {
      top,
      bottom: top + 200,
      right: wide ? 1000 : 200,
    })
    ids.forEach((id, i) => {
      stubRect(item(id), { top: top + i * 100, bottom: top + i * 100 + 100, left: 0, right: 200 })
    })
  }
}

afterEach(() => {
  pressEscape()
  act(() => root.unmount())
  host.remove()
})

const item = (id: string): HTMLElement => host.querySelector(`[data-id="${id}"]`) as HTMLElement

const dragTo = async (id: string, x: number, y: number): Promise<void> => {
  const r = item(id).getBoundingClientRect()
  await act(async () => {
    firePointer(item(id), 'pointerdown', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x, y })
  })
  await act(async () => {
    firePointer(window, 'pointerup', { x, y })
  })
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
