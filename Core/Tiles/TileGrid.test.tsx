// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, pressEscape, stubPointerCapture } from '@pommora/uix/Testing/pointerHarness'
import { getTile, type TileLayout, tileIds } from './Layout/model'
import { insertBand, moveTileToBand } from './Layout/ops'
import { splitTile } from '../Testing/tileLayouts'
import { type Inserting, type InsertTarget, TileGrid } from './TileGrid'
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

  it('seats the add strip under the last band and adds from it, with the board’s height unchanged', () => {
    const onInsert = vi.fn()
    render({ onInsert })
    expect(q('.tile-add')?.style.transform).toBe('translate(0px, 208px)')
    expect(q('.tile-grid')?.style.height).toBe('228px')
    click('.tile-add button')
    expect(onInsert).toHaveBeenCalledOnce()
    expect(onInsert.mock.calls[0][0]).toEqual({ kind: 'append' })
    expect(onInsert.mock.calls[0][1]).toMatchObject({ type: 'click' })
    expect(q('.tile-grid')?.style.height).toBe('228px')
  })

  it('reveals the strip as the pointer nears it and keeps the reveal through a press', () => {
    render()
    const strip = q('.tile-add') as HTMLElement
    strip.getBoundingClientRect = () => ({ left: 0, top: 300, right: 400, bottom: 314 }) as DOMRect
    const move = (y: number, buttons = 0): void =>
      act(() => {
        host.dispatchEvent(
          new PointerEvent('pointermove', { clientX: 100, clientY: y, buttons, bubbles: true }),
        )
      })
    move(290)
    expect(strip.dataset.revealHost).toBe('on')
    move(260)
    expect(strip.dataset.revealHost).toBe('')
    move(290)
    move(290, 1)
    expect(strip.dataset.revealHost).toBe('on')
  })

  it('a locked board offers neither zone nor strip, and an empty one no ghost under a lock', () => {
    render({ locked: true })
    expect(q('.tile-zone')).toBeNull()
    expect(q('.tile-add')).toBeNull()
    render({ locked: true }, { bands: [] })
    expect(q('.tile-ghost')).toBeNull()
  })

  it('an empty board stands one ghost at the first tile’s box, with no zone and no strip', () => {
    render({}, { bands: [] })
    const ghost = q('.tile-ghost')
    expect(ghost?.style.transform).toBe('translate(0px, 0px)')
    expect(ghost?.style.height).toBe('160px')
    expect(q('.tile-zone')).toBeNull()
    expect(q('.tile-add')).toBeNull()
    expect(q('.tile-grid')?.style.height).toBe('188px')
  })

  it('a stacked board has no wedge and keeps its strip', () => {
    render()
    measure(300)
    expect(q('.tile-zone')).toBeNull()
    expect(host.querySelectorAll('.tile-add')).toHaveLength(1)
  })

  it('a gesture withdraws the zones and the strip until its settle commits', () => {
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

  it('an append held from the strip lights the strip and draws no ghost over a board with tiles', () => {
    render({ inserting: { target: { kind: 'append' }, phase: 'menu' } })
    expect(q('.tile-add button')?.hasAttribute('data-reveal-held')).toBe(true)
    expect(q('.tile-ghost')).toBeNull()
  })
})
