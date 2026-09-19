import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_WINDOWS, type WindowsFile } from './windowRecord'
import { installStores, NO_STORES } from '../../Platform/stores'
import { memoryStores } from '../../Testing/memoryStores'
import { readWindowsState, sanitizeWindows, writeWindowsState } from './windowState'

beforeEach(() => {
  installStores(memoryStores().stores)
})
afterEach(() => {
  installStores(NO_STORES)
})

const file: WindowsFile = {
  navSet: { tabs: [{ target: { kind: 'page', id: 'p3' } }], activeIndex: 0 },
  origins: {
    p1: { tabs: [{ target: { kind: 'page', id: 'p2' } }], activeIndex: 0 },
  },
  open: { kind: 'page', originId: 'p1' },
}

describe('readWindowsState', () => {
  it('reads the empty shape before anything is written', () => {
    expect(readWindowsState()).toEqual(EMPTY_WINDOWS)
  })

  it('round-trips the nav set, the per-origin sets and the open pointer', () => {
    writeWindowsState(file)
    expect(readWindowsState()).toEqual(file)
  })

  it('round-trips a matrix window, which keeps no set of its own', () => {
    const matrix: WindowsFile = {
      navSet: null,
      origins: {},
      open: { kind: 'matrix', originId: 'matrix' },
    }
    writeWindowsState(matrix)
    expect(readWindowsState()).toEqual(matrix)
  })

  it('a rewrite replaces the row', () => {
    writeWindowsState(file)
    writeWindowsState(EMPTY_WINDOWS)
    expect(readWindowsState()).toEqual(EMPTY_WINDOWS)
  })

  it('reads the empty shape with no database open', () => {
    writeWindowsState(file)
    installStores(NO_STORES)
    expect(readWindowsState()).toEqual(EMPTY_WINDOWS)
  })
})

describe('sanitizeWindows', () => {
  it('refuses a payload that is not a windows file', () => {
    expect(sanitizeWindows(null)).toBeNull()
    expect(sanitizeWindows({ navSet: null })).toBeNull()
  })

  it('strips display fields and drops refs of no storable kind', () => {
    const clean = sanitizeWindows({
      navSet: {
        tabs: [
          { target: { kind: 'navwindow' } },
          { target: { kind: 'page', id: 'p1', path: 'stale.md' } },
        ],
        activeIndex: 0,
      },
      origins: {},
      open: { kind: 'weird', originId: 'p1' },
    })
    expect(clean?.navSet?.tabs).toEqual([{ target: { kind: 'page', id: 'p1' } }])
    expect(clean?.open).toBeNull()
  })

  it('drops a Matrix tab from a stored strip — no window tab renders that kind', () => {
    const clean = sanitizeWindows({
      navSet: null,
      origins: {
        p1: {
          tabs: [{ target: { kind: 'matrix' } }, { target: { kind: 'page', id: 'p1' } }],
          activeIndex: 0,
        },
      },
      open: { kind: 'matrix', originId: 'matrix' },
    })
    expect(clean?.origins.p1?.tabs).toEqual([{ target: { kind: 'page', id: 'p1' } }])
    expect(clean?.open).toEqual({ kind: 'matrix', originId: 'matrix' })
  })
})
