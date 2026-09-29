import { describe, expect, it } from 'vitest'
import type { Box } from './shared'
import { ARROW_DIRS, keyboardNext, lineProbes } from './keyboard'
import type { Geometry, Row } from './reorderModel'

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

describe('lineProbes — the keyboard reach of a line list', () => {
  const rowAt = (id: string, top: number): Row => ({
    id,
    top,
    bottom: top + 40,
    mid: top + 20,
    left: 0,
    right: 100,
  })
  const geometry = (rows: Row[], bottom: number): Geometry => ({
    rows,
    groups: new Map(),
    bottom,
  })

  it('probes each row before, into, and after, at 1/8, 1/2, and 7/8', () => {
    const probes = lineProbes(geometry([rowAt('a', 0)], 40))
    expect(probes.slice(0, 3)).toEqual([
      { y: 5, row: 'a' },
      { y: 20, row: 'a' },
      { y: 35, row: 'a' },
    ])
  })

  it('always ends with the list-end probe at the geometry bottom', () => {
    const probes = lineProbes(geometry([rowAt('a', 0), rowAt('b', 40)], 90))
    expect(probes).toHaveLength(7)
    expect(probes.at(-1)).toEqual({ y: 90, row: 'b' })
  })

  it('probes nothing for an empty list', () => {
    expect(lineProbes(geometry([], 0))).toEqual([])
  })
})
