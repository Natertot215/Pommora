// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, pressEscape, stubPointerCapture } from '@pommora/uix/Testing/pointerHarness'
import { getTile, type TileLayout, tileIds } from './Layout/model'
import { insertBand, moveTileToBand } from './Layout/ops'
import { splitTile } from '../Testing/tileLayouts'
import { type Inserting, TileGrid } from './TileGrid'
import type { InsertTarget } from './tiles'
import { useState } from 'react'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('./Layout/ops', async (original) => {
  const ops = await original<typeof import('./Layout/ops')>()
  return { ...ops, moveTileToBand: vi.fn(ops.moveTileToBand) }
})

stubPointerCapture()
let observed: (() => void) | null = null
vi.stubGlobal(
  'ResizeObserver',
  class {
    constructor(cb: () => void) {
      observed = cb
    }
    observe(): void {}
    disconnect(): void {
      observed = null
    }
  },
)

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const layout = insertBand(insertBand({ bands: [] }, 0, 'a', 200), 1, 'b', 100)

const grid = {
  tileClassName: () => undefined,
  editingId: null,
  menuOpenId: null,
  tileStyle: () => undefined,
  onBusyChange: () => {},
  locked: false,
  isTileLocked: () => false,
  onHandleMenu: () => {},
  inserting: null,
  onInsert: () => {},
}

function mount(): { onLayoutChange: ReturnType<typeof vi.fn>; edge: HTMLElement } {
  const onLayoutChange = vi.fn()
  act(() =>
    root.render(
      <TileGrid
        {...grid}
        layout={layout}
        onLayoutChange={onLayoutChange}
        renderTile={(id) => <span data-tile={id} />}
      />,
    ),
  )
  return {
    onLayoutChange,
    edge: host.querySelector('.resize-edge-s') as HTMLElement,
  }
}

const tileEl = (id: string): HTMLElement =>
  [...host.querySelectorAll<HTMLElement>('.tile')].find((t) =>
    t.querySelector(`[data-tile="${id}"]`),
  ) as HTMLElement

const measure = (px: number): void => {
  const grid = host.querySelector('.tile-grid') as HTMLElement
  Object.defineProperty(grid, 'clientWidth', { value: px, configurable: true })
  act(() => observed?.())
}

const settled = (id: string): void =>
  act(() => {
    const e = new Event('transitionend', { bubbles: true })
    Object.defineProperty(e, 'propertyName', { value: 'transform' })
    tileEl(id).dispatchEvent(e)
  })

describe('the grid on the gesture engine', () => {
  it('a south-edge drag released on the window commits the stretched height once', () => {
    const { onLayoutChange, edge } = mount()
    act(() => firePointer(edge, 'pointerdown', { x: 0, y: 0 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 30 }))
    act(() => firePointer(window, 'pointerup'))
    expect(onLayoutChange).toHaveBeenCalledOnce()
    expect(getTile(onLayoutChange.mock.calls[0][0], 'a')?.h).toBe(230)
  })

  it('Escape mid-drag commits nothing; a press that never moved commits nothing', () => {
    const { onLayoutChange, edge } = mount()
    act(() => firePointer(edge, 'pointerdown', { x: 0, y: 0 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 30 }))
    act(() => pressEscape())
    act(() => firePointer(edge, 'pointerdown', { x: 0, y: 0 }))
    act(() => firePointer(window, 'pointerup'))
    expect(onLayoutChange).not.toHaveBeenCalled()
    act(() => firePointer(edge, 'pointerdown', { x: 0, y: 0 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 30 }))
    act(() => firePointer(window, 'pointerup'))
    expect(onLayoutChange).toHaveBeenCalledOnce()
  })

  it('a handle drag onto the top seam lifts, settles, and commits the move once', () => {
    const { onLayoutChange } = mount()
    const handle = tileEl('b').querySelector('.tile-handle') as HTMLElement
    act(() => firePointer(handle, 'pointerdown', { x: 0, y: 210 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 5 }))
    expect(tileEl('b').classList.contains('is-lifted')).toBe(true)
    act(() => firePointer(window, 'pointerup'))
    expect(onLayoutChange).not.toHaveBeenCalled()
    settled('b')
    expect(onLayoutChange).toHaveBeenCalledOnce()
    expect(tileIds(onLayoutChange.mock.calls[0][0])).toEqual(['b', 'a'])
  })

  it('a handle press owns the layout from the press, not the first move', () => {
    const onBusyChange = vi.fn()
    act(() =>
      root.render(
        <TileGrid
          {...grid}
          layout={layout}
          onLayoutChange={() => {}}
          renderTile={(id) => <span data-tile={id} />}
          onBusyChange={onBusyChange}
        />,
      ),
    )
    const handle = tileEl('b').querySelector('.tile-handle') as HTMLElement
    act(() => firePointer(handle, 'pointerdown', { x: 0, y: 210 }))
    expect(onBusyChange).toHaveBeenLastCalledWith(true)
    act(() => firePointer(window, 'pointerup'))
    expect(onBusyChange).toHaveBeenLastCalledWith(false)
  })

  it('pairs every hold with one release, through repeated gestures and an unmount mid-gesture', () => {
    const onBusyChange = vi.fn()
    act(() =>
      root.render(
        <TileGrid
          {...grid}
          layout={layout}
          onLayoutChange={() => {}}
          renderTile={(id) => <span data-tile={id} />}
          onBusyChange={onBusyChange}
        />,
      ),
    )
    const handle = tileEl('b').querySelector('.tile-handle') as HTMLElement
    for (let i = 0; i < 2; i++) {
      act(() => firePointer(handle, 'pointerdown', { x: 0, y: 210 }))
      act(() => firePointer(window, 'pointerup'))
    }
    act(() => firePointer(handle, 'pointerdown', { x: 0, y: 210 }))
    act(() => root.unmount())
    expect(onBusyChange.mock.calls).toEqual([[true], [false], [true], [false], [true], [false]])
    root = createRoot(host)
  })

  it('rebuilds the preview only when the drop target changes', () => {
    mount()
    vi.mocked(moveTileToBand).mockClear()
    const handle = tileEl('b').querySelector('.tile-handle') as HTMLElement
    act(() => firePointer(handle, 'pointerdown', { x: 0, y: 210 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 5 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 6 }))
    expect(moveTileToBand).toHaveBeenCalledOnce()
    act(() => pressEscape())
  })

  it('unmounting during a settle commits the decided move', () => {
    const { onLayoutChange } = mount()
    const handle = tileEl('b').querySelector('.tile-handle') as HTMLElement
    act(() => firePointer(handle, 'pointerdown', { x: 0, y: 210 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 5 }))
    act(() => firePointer(window, 'pointerup'))
    act(() => root.unmount())
    expect(onLayoutChange).toHaveBeenCalledOnce()
    expect(tileIds(onLayoutChange.mock.calls[0][0])).toEqual(['b', 'a'])
    root = createRoot(host)
  })

  it('Escape during a handle drag settles home and commits nothing', () => {
    const { onLayoutChange } = mount()
    const handle = tileEl('b').querySelector('.tile-handle') as HTMLElement
    act(() => firePointer(handle, 'pointerdown', { x: 0, y: 210 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 5 }))
    act(() => pressEscape())
    expect(tileEl('b').classList.contains('is-lifted')).toBe(true)
    settled('b')
    expect(tileEl('b').classList.contains('is-lifted')).toBe(false)
    expect(onLayoutChange).not.toHaveBeenCalled()
  })

  it('under the stacking width the board is static: a press starts no gesture', () => {
    const onLayoutChange = vi.fn()
    const onBusyChange = vi.fn()
    act(() =>
      root.render(
        <TileGrid
          {...grid}
          layout={layout}
          onLayoutChange={onLayoutChange}
          onBusyChange={onBusyChange}
          renderTile={(id) => <span data-tile={id} />}
        />,
      ),
    )
    measure(300)
    const edge = host.querySelector('.resize-edge-s') as HTMLElement
    act(() => firePointer(edge, 'pointerdown', { x: 0, y: 0 }))
    act(() => firePointer(window, 'pointermove', { x: 0, y: 30 }))
    act(() => firePointer(window, 'pointerup'))
    expect(onLayoutChange).not.toHaveBeenCalled()
    expect(onBusyChange).not.toHaveBeenCalledWith(true)
  })

  it('a row draws as one column under the width and returns only past the margin', () => {
    const rowBoard = splitTile(insertBand({ bands: [] }, 0, 'a', 200), 'a', 'e', 'c')
    act(() =>
      root.render(
        <TileGrid
          {...grid}
          layout={rowBoard}
          onLayoutChange={() => {}}
          renderTile={(id) => <span data-tile={id} />}
        />,
      ),
    )
    measure(300)
    expect(tileEl('c').style.width).toBe('calc(100% + 0px)')
    measure(500)
    expect(tileEl('c').style.width).toBe('calc(100% + 0px)')
    measure(600)
    expect(tileEl('c').style.width).toBe('calc(50% - 4px)')
  })
})

describe('the handle reveal', () => {
  const reveal = (): string | undefined => tileEl('a').dataset.revealHost
  const move = (x: number, y: number, buttons = 0): void =>
    act(() => {
      tileEl('a').dispatchEvent(
        new PointerEvent('pointermove', { clientX: x, clientY: y, buttons, bubbles: true }),
      )
    })

  beforeEach(() => {
    act(() =>
      root.render(
        <TileGrid
          {...grid}
          layout={layout}
          onLayoutChange={vi.fn()}
          editingId="a"
          renderTile={(id) => <span data-tile={id} />}
        />,
      ),
    )
    const tile = tileEl('a')
    tile.getBoundingClientRect = () => ({ left: 0, top: 100, right: 400, bottom: 300 }) as DOMRect
    const handle = tile.querySelector('.tile-handle') as HTMLElement
    handle.getBoundingClientRect = () => ({ left: 20, top: 100, right: 40, bottom: 110 }) as DOMRect
  })

  it('reveals within the corner reach of the handle and hides past it', () => {
    move(60, 140)
    expect(reveal()).toBe('on')
    move(380, 100 + 300)
    expect(reveal()).toBe('off')
  })

  it('holds where it stands through a press, and hides once the pointer leaves the tile', () => {
    move(60, 140)
    move(380, 400, 1)
    expect(reveal()).toBe('on')
    act(() => {
      tileEl('a').dispatchEvent(new PointerEvent('pointerout', { relatedTarget: document.body }))
    })
    expect(reveal()).toBe('off')
  })

  it('reads the corner afresh once the tile settles where its reflow moved it', () => {
    move(60, 140)
    tileEl('a').getBoundingClientRect = () =>
      ({ left: 0, top: 700, right: 400, bottom: 900 }) as DOMRect
    settled('a')
    move(60, 140)
    expect(reveal()).toBe('off')
  })
})

describe('the ghost tiles and the add strip', () => {
  const rowBoard: TileLayout = {
    bands: [
      {
        node: {
          kind: 'row',
          ratios: [0.5, 0.5],
          children: [
            { kind: 'tile', id: 'a', h: 200 },
            { kind: 'tile', id: 'b', h: 100 },
          ],
        },
      },
    ],
  }
  const render = (over: Partial<Parameters<typeof TileGrid>[0]> = {}, board = rowBoard): void =>
    act(() =>
      root.render(
        <TileGrid
          {...grid}
          layout={board}
          onLayoutChange={() => {}}
          renderTile={(id) => <span data-tile={id} />}
          {...over}
        />,
      ),
    )
  const q = (sel: string): HTMLElement | null => host.querySelector<HTMLElement>(sel)
  const hoverZone = (): void =>
    act(() => {
      q('.tile-zone')?.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, relatedTarget: document.body }),
      )
      window.dispatchEvent(new PointerEvent('pointermove'))
    })
  const tick = (ms: number): void => act(() => void vi.advanceTimersByTime(ms))
  // A press, its release, and the click they make.
  const click = (sel: string): void =>
    act(() => {
      const el = q(sel) as HTMLElement
      firePointer(el, 'pointerdown', { x: 0, y: 0 })
      firePointer(window, 'pointerup')
      el.click()
    })

  // A drop arms the kit's one-click swallow on a zero timer that jsdom never fires here; a throwaway click spends it before a test clicks for real.
  beforeEach(() => {
    document.body.click()
    host.style.overflowY = 'auto'
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('draws one zone per wedge, and a dwell on it raises the ghost in the wedge’s box', () => {
    render()
    expect(host.querySelectorAll('.tile-zone')).toHaveLength(1)
    hoverZone()
    tick(999)
    expect(q('.tile-ghost')).toBeNull()
    tick(1)
    expect(q('.tile-ghost')?.style.height).toBe('92px')
    expect(q('.tile-ghost')?.style.transform).toBe('translate(4px, 108px)')
  })

  const hoverBottom = (): void =>
    act(() => {
      q('.tile-add')?.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, relatedTarget: document.body }),
      )
      window.dispatchEvent(new PointerEvent('pointermove'))
    })
  const leaveBottom = (): void =>
    act(() => {
      q('.tile-add')?.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body }),
      )
    })
  // The host is the pane, and shows `room` px below the grid's resting box; the grid's sample reads it.
  const paneWithRoom = (room: number): void => {
    host.getBoundingClientRect = () => ({ top: 0, bottom: 226 + room }) as DOMRect
    const grid = q('.tile-grid') as HTMLElement
    grid.getBoundingClientRect = () => ({ top: 0, bottom: 226 }) as DOMRect
    act(() => observed?.())
  }

  it('with room below, the bottom zone spans it, a dwell raises a ghost filling it, and the board grows to the ghost’s end', () => {
    const onInsert = vi.fn()
    render({ onInsert })
    const zone = q('.tile-add') as HTMLElement
    expect(zone.style.transform).toBe('translate(0px, 200px)')
    expect(q('.tile-grid')?.style.height).toBe('226px')
    paneWithRoom(400)
    expect(zone.style.height).toBe('426px')
    hoverBottom()
    expect(zone.dataset.revealHost).toBe('off')
    tick(999)
    expect(q('.tile-ghost')).toBeNull()
    tick(1)
    expect(q('.tile-ghost')?.style.transform).toBe('translate(0px, 208px)')
    expect(q('.tile-ghost')?.style.height).toBe('418px')
    expect(q('.tile-grid')?.style.height).toBe('626px')
    // The ghost draws over its zone, so the click is the ghost's.
    expect(
      zone.compareDocumentPosition(q('.tile-ghost') as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    click('.tile-ghost')
    expect(onInsert).toHaveBeenCalledOnce()
    expect(onInsert.mock.calls[0][0]).toEqual({ kind: 'append', h: 418 })
  })

  it('with less than a tile’s worth below, the bottom zone is the clearance and offers the strip at once, one gutter in', () => {
    const onInsert = vi.fn()
    render({ onInsert })
    paneWithRoom(61)
    const zone = q('.tile-add') as HTMLElement
    expect(zone.style.height).toBe('26px')
    hoverBottom()
    expect(zone.dataset.revealHost).toBe('')
    expect(q('.tile-add button')?.style.top).toBe('8px')
    tick(1000)
    expect(q('.tile-ghost')).toBeNull()
    expect(q('.tile-grid')?.style.height).toBe('226px')
    click('.tile-add button')
    expect(onInsert).toHaveBeenCalledOnce()
    expect(onInsert.mock.calls[0][0]).toEqual({ kind: 'append' })
    expect(onInsert.mock.calls[0][1]).toMatchObject({ type: 'click' })
  })

  it('a bottom ghost whose room closes draws nothing in that render, and the strip takes the bottom', () => {
    render()
    paneWithRoom(400)
    hoverBottom()
    tick(1000)
    expect(q('.tile-ghost')).not.toBeNull()
    paneWithRoom(0)
    expect(q('.tile-ghost')).toBeNull()
    expect(q('.tile-add')?.dataset.revealHost).toBe('')
    expect(q('.tile-add')?.style.height).toBe('26px')
    expect(q('.tile-grid')?.style.height).toBe('226px')
  })

  it('the room is read with the board’s sample, so a pane or board resize changes the shape', () => {
    render()
    paneWithRoom(61)
    expect(q('.tile-add')?.dataset.revealHost).toBe('')
    paneWithRoom(62)
    hoverBottom()
    expect(q('.tile-add')?.dataset.revealHost).toBe('off')
    tick(1000)
    expect(q('.tile-ghost')?.style.height).toBe('80px')
  })

  it('the strip holds its menu and fades no ghost; a bottom ghost holds and fades as a wedge’s does', () => {
    let set: (v: Inserting | null) => void = () => {}
    function Host(): React.JSX.Element {
      const [inserting, setInserting] = useState<Inserting | null>(null)
      set = setInserting
      return (
        <TileGrid
          {...grid}
          layout={rowBoard}
          onLayoutChange={() => {}}
          renderTile={(id) => <span data-tile={id} />}
          inserting={inserting}
          onInsert={(target: InsertTarget) => setInserting({ target, phase: 'menu' })}
        />
      )
    }
    act(() => root.render(<Host />))
    paneWithRoom(40)
    hoverBottom()
    click('.tile-add button')
    expect(q('.tile-add button')?.hasAttribute('data-reveal-held')).toBe(true)
    expect(q('.tile-ghost')).toBeNull()
    leaveBottom()
    expect(q('.tile-add button')?.hasAttribute('data-reveal-held')).toBe(true)
    act(() => set(null))
    expect(q('.tile-ghost')).toBeNull()
    expect(q('.tile-add button')?.hasAttribute('data-reveal-held')).toBe(false)

    paneWithRoom(400)
    hoverBottom()
    tick(1000)
    const ghost = q('.tile-ghost')
    click('.tile-ghost')
    expect(q('.tile-ghost')).toBe(ghost)
    expect(ghost?.hasAttribute('data-reveal-held')).toBe(true)
    expect(q('.tile-add button')?.hasAttribute('data-reveal-held')).toBe(false)
    act(() => set(null))
    expect(ghost?.classList.contains('is-closing')).toBe(true)
  })

  it('a locked board offers neither zone nor bottom zone, and an empty one no ghost under a lock', () => {
    render({ locked: true })
    expect(q('.tile-zone')).toBeNull()
    expect(q('.tile-add')).toBeNull()
    render({ locked: true }, { bands: [] })
    expect(q('.tile-ghost')).toBeNull()
  })

  it('an empty board stands one ghost at the first tile’s box, with no zone', () => {
    render({}, { bands: [] })
    const ghost = q('.tile-ghost')
    expect(ghost?.style.transform).toBe('translate(0px, 0px)')
    expect(ghost?.style.height).toBe('250px')
    expect(q('.tile-zone')).toBeNull()
    expect(q('.tile-add')).toBeNull()
    expect(q('.tile-grid')?.style.height).toBe('250px')
  })

  it('a stacked board has no wedge and keeps its bottom zone', () => {
    render()
    measure(300)
    expect(q('.tile-zone')).toBeNull()
    expect(host.querySelectorAll('.tile-add')).toHaveLength(1)
  })

  it('a gesture withdraws the zones until its settle commits', () => {
    render()
    const handle = tileEl('b').querySelector('.tile-handle') as HTMLElement
    act(() => firePointer(handle, 'pointerdown', { x: 0, y: 150 }))
    expect(q('.tile-zone')).toBeNull()
    expect(q('.tile-add')).toBeNull()
    act(() => firePointer(window, 'pointermove', { x: 0, y: 5 }))
    act(() => firePointer(window, 'pointerup'))
    expect(q('.tile-zone')).toBeNull()
    settled('b')
    expect(q('.tile-zone')).not.toBeNull()
    expect(q('.tile-add')).not.toBeNull()
  })

  it('clicking the ghost reports its wedge; an open menu takes no second click', () => {
    const onInsert = vi.fn()
    render({ onInsert })
    hoverZone()
    tick(1000)
    click('.tile-ghost')
    expect(onInsert).toHaveBeenCalledOnce()
    expect(onInsert.mock.calls[0][0]).toEqual({ kind: 'wedge', above: 'b' })
    expect(onInsert.mock.calls[0][1]).toMatchObject({ type: 'click' })
    render({ onInsert, inserting: { target: { kind: 'wedge', above: 'b' }, phase: 'menu' } })
    click('.tile-ghost')
    click('.tile-add button')
    expect(onInsert).toHaveBeenCalledOnce()
  })

  it('the hovered ghost becomes the held one in place, fades on dismissal, and leaves at once on landing', () => {
    let set: (v: Inserting | null) => void = () => {}
    function Host(): React.JSX.Element {
      const [inserting, setInserting] = useState<Inserting | null>(null)
      set = setInserting
      return (
        <TileGrid
          {...grid}
          layout={rowBoard}
          onLayoutChange={() => {}}
          renderTile={(id) => <span data-tile={id} />}
          inserting={inserting}
          onInsert={(target: InsertTarget) => setInserting({ target, phase: 'menu' })}
        />
      )
    }
    act(() => root.render(<Host />))
    hoverZone()
    tick(1000)
    const ghost = q('.tile-ghost')
    click('.tile-ghost')
    expect(q('.tile-ghost')).toBe(ghost)
    expect(ghost?.hasAttribute('data-reveal-held')).toBe(true)
    act(() => set(null))
    expect(q('.tile-ghost')).toBe(ghost)
    expect(ghost?.classList.contains('is-closing')).toBe(true)
    tick(2000)
    expect(q('.tile-ghost')).toBeNull()
    act(() => set({ target: { kind: 'wedge', above: 'b' }, phase: 'menu' }))
    act(() => set({ target: { kind: 'wedge', above: 'b' }, phase: 'flight' }))
    expect(q('.tile-ghost')).not.toBeNull()
    act(() => set(null))
    expect(q('.tile-ghost')).toBeNull()
  })

  it('an append holding a height draws the bottom ghost held at it; one without holds the strip', () => {
    render({ inserting: { target: { kind: 'append', h: 300 }, phase: 'menu' } })
    expect(q('.tile-ghost')?.style.transform).toBe('translate(0px, 208px)')
    expect(q('.tile-ghost')?.style.height).toBe('300px')
    expect(q('.tile-ghost')?.hasAttribute('data-reveal-held')).toBe(true)
    expect(q('.tile-add button')?.hasAttribute('data-reveal-held')).toBe(false)
    render({ inserting: { target: { kind: 'append' }, phase: 'menu' } })
    expect(q('.tile-ghost')).toBeNull()
    expect(q('.tile-add button')?.hasAttribute('data-reveal-held')).toBe(true)
  })
})
