// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { type Axis, beforeIdAt, freeze, nearest, placeItem, slotPoint } from './placement'

type R = { left: number; top: number; width: number; height: number }

const stub = (el: HTMLElement, r: R): void => {
  el.getBoundingClientRect = () =>
    ({ ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top }) as DOMRect
}

function frozenOf(
  rects: R[],
  axis: Axis | undefined,
  opts: { box?: R; activeHeight?: number } = {},
): ReturnType<typeof freeze> {
  const parent = document.createElement('div')
  stub(parent, opts.box ?? { left: 0, top: 0, width: 0, height: 0 })
  const els = new Map<string, HTMLElement>()
  const ids = rects.map((_, i) => `i${i}`)
  rects.forEach((r, i) => {
    const el = document.createElement('div')
    stub(el, r)
    parent.append(el)
    els.set(ids[i], el)
  })
  return freeze(ids, els, opts.box ? parent : null, axis, opts.activeHeight ?? 0) ?? null
}

const column = (n: number): R[] =>
  Array.from({ length: n }, (_, i) => ({ left: 0, top: i * 10, width: 100, height: 10 }))

const grid = (count: number, cols: number): R[] =>
  Array.from({ length: count }, (_, i) => ({
    left: (i % cols) * 100,
    top: Math.floor(i / cols) * 100,
    width: 100,
    height: 100,
  }))

const SIZE = { width: 100, height: 10 }

describe('freeze', () => {
  it('measures rects in the box’s local space, with rows, row tops, and the grid', () => {
    const f = frozenOf(
      [
        { left: 50, top: 20, width: 100, height: 100 },
        { left: 150, top: 20, width: 100, height: 100 },
        { left: 50, top: 120, width: 100, height: 100 },
      ],
      undefined,
      { box: { left: 50, top: 20, width: 200, height: 200 } },
    )
    expect(f?.rects.map((r) => [r.left, r.top, r.cx, r.cy])).toEqual([
      [0, 0, 50, 50],
      [100, 0, 150, 50],
      [0, 100, 50, 150],
    ])
    expect(f?.rows).toEqual([0, 2])
    expect(f?.rowTops).toEqual([0, 100])
    expect(f?.centres).toEqual([])
    expect(f?.origin).toEqual({ x: 50, y: 20 })
    expect(f?.pitch).toBe(100)
    expect(f?.grid).toEqual({ x0: 0, stride: 100, cols: 2, col: 0, top: 100 })
    expect(f?.tail).toEqual({ x: 100, y: 100 })
  })

  it('records each rect’s centre on the axis and the gap between neighbours', () => {
    const f = frozenOf(
      [
        { left: 0, top: 0, width: 200, height: 30 },
        { left: 204, top: 0, width: 120, height: 30 },
      ],
      'x',
      { box: { left: 0, top: 0, width: 400, height: 30 } },
    )
    expect(f?.centres).toEqual([100, 264])
    expect(f?.gap).toBe(4)
    expect(f?.tail).toEqual({ x: 328, y: 0 })
  })

  it('skips ids with no element and has no frame without a box or an item', () => {
    const parent = document.createElement('div')
    stub(parent, { left: 0, top: 0, width: 0, height: 0 })
    const el = document.createElement('div')
    stub(el, { left: 0, top: 0, width: 10, height: 10 })
    parent.append(el)
    const els = new Map([['b', el]])
    expect(freeze(['a', 'b'], els, null, 'y', 0)?.ids).toEqual(['b'])
    expect(freeze(['a'], els, null, 'y', 0)).toBeNull()
  })
})

describe('placeItem — the displacement core', () => {
  const at = (
    f: ReturnType<typeof frozenOf>,
    i: number,
    active: number,
    over: number,
  ): { x: number; y: number } =>
    placeItem(f as NonNullable<typeof f>, undefined, i, active, over, SIZE)

  it('shifts the passed-over items up when dragging forward', () => {
    const f = frozenOf(column(4), undefined)
    expect(at(f, 1, 0, 2).y).toBe(0)
    expect(at(f, 2, 0, 2).y).toBe(10)
    expect(at(f, 3, 0, 2).y).toBe(30)
  })

  it('shifts the passed-over items down when dragging backward', () => {
    const f = frozenOf(column(4), undefined)
    expect(at(f, 0, 3, 1).y).toBe(0)
    expect(at(f, 1, 3, 1).y).toBe(20)
    expect(at(f, 2, 3, 1).y).toBe(30)
  })

  it('leaves the others in place when over is the lifted item’s own slot', () => {
    const f = frozenOf(column(4), undefined)
    for (const i of [0, 2, 3]) expect(at(f, i, 1, 1).y).toBe(i * 10)
  })

  it('closes the gap when the lifted item is in another zone', () => {
    const f = frozenOf(column(4), undefined)
    expect(at(f, 0, 1, -1).y).toBe(0)
    expect(at(f, 2, 1, -1).y).toBe(10)
    expect(at(f, 3, 1, -1).y).toBe(20)
  })

  it('opens a slot for a foreign item, and walks the grid past the last cell', () => {
    const f = frozenOf(grid(4, 2), undefined, { box: { left: 0, top: 0, width: 200, height: 200 } })
    const size = { width: 100, height: 100 }
    const place = (i: number, over: number) =>
      placeItem(f as NonNullable<typeof f>, undefined, i, -1, over, size)
    expect(place(0, 0)).toEqual({ x: 100, y: 0 })
    expect(place(3, 4)).toEqual({ x: 100, y: 100 })
    expect(place(3, 0)).toEqual({ x: 0, y: 200 })
  })

  it('moves the passed-over item back by the lifted width on an axis row', () => {
    const f = frozenOf(
      [
        { left: 0, top: 0, width: 200, height: 30 },
        { left: 200, top: 0, width: 120, height: 30 },
        { left: 320, top: 0, width: 120, height: 30 },
      ],
      'x',
      { box: { left: 0, top: 0, width: 440, height: 30 } },
    ) as NonNullable<ReturnType<typeof frozenOf>>
    const size = { width: 200, height: 30 }
    expect(placeItem(f, 'x', 1, 0, 1, size)).toEqual({ x: 0, y: 0 })
    expect(slotPoint(f, 'x', 0, 1, size)).toEqual({ x: 120, y: 0 })
  })

  it('opens a slot the size of a foreign item on an axis row', () => {
    const f = frozenOf(
      [
        { left: 0, top: 0, width: 200, height: 30 },
        { left: 204, top: 0, width: 120, height: 30 },
        { left: 328, top: 0, width: 120, height: 30 },
      ],
      'x',
      { box: { left: 0, top: 0, width: 448, height: 30 } },
    ) as NonNullable<ReturnType<typeof frozenOf>>
    const size = { width: 80, height: 30 }
    expect(placeItem(f, 'x', 1, -1, 1, size)).toEqual({ x: 288, y: 0 })
    expect(slotPoint(f, 'x', -1, 1, size)).toEqual({ x: 204, y: 0 })
  })
})

describe('slotPoint', () => {
  const row = (): NonNullable<ReturnType<typeof frozenOf>> =>
    frozenOf(
      [
        { left: 0, top: 0, width: 200, height: 30 },
        { left: 200, top: 0, width: 120, height: 30 },
        { left: 320, top: 0, width: 120, height: 30 },
      ],
      'x',
      { box: { left: 0, top: 0, width: 440, height: 30 } },
    ) as NonNullable<ReturnType<typeof frozenOf>>
  const size = { width: 80, height: 30 }

  it('finds the lifted item’s own slot', () => {
    expect(slotPoint(row(), 'x', 1, 1, size)).toEqual({ x: 200, y: 0 })
  })

  it('finds a foreign item’s slot before an item and at the tail', () => {
    expect(slotPoint(row(), 'x', -1, 1, size)).toEqual({ x: 200, y: 0 })
    expect(slotPoint(row(), 'x', -1, 3, size)).toEqual({ x: 440, y: 0 })
  })

  it('finds the tail of a free grid', () => {
    const f = frozenOf(grid(4, 2), undefined, {
      box: { left: 0, top: 0, width: 200, height: 200 },
    }) as NonNullable<ReturnType<typeof frozenOf>>
    expect(slotPoint(f, undefined, -1, 1, SIZE)).toEqual({ x: 100, y: 0 })
    expect(slotPoint(f, undefined, -1, 4, SIZE)).toEqual({ x: 0, y: 200 })
  })

  it('keeps a single-item axis zone’s own slot where the item stands', () => {
    const f = frozenOf([{ left: 30, top: 10, width: 100, height: 30 }], 'y', {
      box: { left: 0, top: 0, width: 200, height: 100 },
    }) as NonNullable<ReturnType<typeof frozenOf>>
    expect(slotPoint(f, 'y', 0, 0, SIZE)).toEqual({ x: 30, y: 10 })
  })

  it('puts a foreign item at the origin of an empty axis zone', () => {
    const f = frozenOf([], 'y', {
      box: { left: 0, top: 0, width: 200, height: 100 },
    }) as NonNullable<ReturnType<typeof frozenOf>>
    expect(slotPoint(f, 'y', -1, 0, SIZE)).toEqual({ x: 0, y: 0 })
  })
})

describe('nearest', () => {
  const half = { width: 50, height: 5 }

  it('picks between the two neighbours of the pointer on an axis', () => {
    const f = frozenOf(column(5), 'y', {
      box: { left: 0, top: 0, width: 100, height: 50 },
    }) as NonNullable<ReturnType<typeof frozenOf>>
    expect(nearest(f, 5, { x: 50, y: 27 }, half, 'y').at).toBe(2)
    expect(nearest(f, 5, { x: 50, y: 31 }, half, 'y').at).toBe(3)
    expect(nearest(f, 5, { x: 50, y: -40 }, half, 'y').at).toBe(0)
  })

  it('reaches the tail slot when the zone holds more than it measured', () => {
    const f = frozenOf(column(5), 'y', {
      box: { left: 0, top: 0, width: 100, height: 50 },
    }) as NonNullable<ReturnType<typeof frozenOf>>
    expect(nearest(f, 6, { x: 50, y: 60 }, half, 'y')).toEqual({ at: 5, dist: 5 })
  })

  it('searches only the pointer’s row and the rows beside it on a grid', () => {
    const f = frozenOf(grid(6, 2), undefined, {
      box: { left: 0, top: 0, width: 200, height: 300 },
    }) as NonNullable<ReturnType<typeof frozenOf>>
    const cell = { width: 50, height: 50 }
    expect(nearest(f, 6, { x: 150, y: 20 }, cell, undefined).at).toBe(1)
    expect(nearest(f, 6, { x: 50, y: 290 }, cell, undefined).at).toBe(4)
    expect(nearest(f, 6, { x: 60, y: 140 }, cell, undefined).at).toBe(2)
  })
})

describe('beforeIdAt', () => {
  it('names the id at the index once the skipped one is removed', () => {
    expect(beforeIdAt(['a', 'b', 'c'], 'b', 1)).toBe('c')
    expect(beforeIdAt(['a', 'b', 'c'], null, 1)).toBe('b')
  })

  it('answers null past the last id', () => {
    expect(beforeIdAt(['a', 'b', 'c'], 'b', 2)).toBeNull()
  })
})
