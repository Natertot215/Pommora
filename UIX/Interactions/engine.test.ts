import { describe, it, expect } from 'vitest'
import { placeCell } from './engine'
import type { Box } from './shared'
import { keyboardNext, ARROW_DIRS } from './keyboard'

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

describe('keyboardNext — arrow navigation', () => {
  it('steps a vertical list down/up by one slot', () => {
    const r = column(5)
    expect(keyboardNext(r, 0, ARROW_DIRS.ArrowDown)).toBe(1)
    expect(keyboardNext(r, 2, ARROW_DIRS.ArrowUp)).toBe(1)
  })

  it('returns the same index when nothing lies ahead', () => {
    const r = column(5)
    expect(keyboardNext(r, 4, ARROW_DIRS.ArrowDown)).toBe(4)
    expect(keyboardNext(r, 0, ARROW_DIRS.ArrowUp)).toBe(0)
    expect(keyboardNext(r, 0, ARROW_DIRS.ArrowLeft)).toBe(0)
  })

  it('navigates a grid by row and column', () => {
    const g = grid(9, 3)
    expect(keyboardNext(g, 0, ARROW_DIRS.ArrowRight)).toBe(1)
    expect(keyboardNext(g, 0, ARROW_DIRS.ArrowDown)).toBe(3)
    expect(keyboardNext(g, 4, ARROW_DIRS.ArrowUp)).toBe(1)
    expect(keyboardNext(g, 4, ARROW_DIRS.ArrowLeft)).toBe(3)
    expect(keyboardNext(g, 4, ARROW_DIRS.ArrowRight)).toBe(5)
  })
})
