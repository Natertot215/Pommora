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
  navSet: { tabs: [{ target: { kind: 'page', id: 'p3' } }] },
  pageSet: { tabs: [{ target: { kind: 'space', id: 's1' } }] },
  open: { kind: 'page' },
}

describe('readWindowsState', () => {
  it('reads the empty shape before anything is written', () => {
    expect(readWindowsState()).toEqual(EMPTY_WINDOWS)
  })

  it('round-trips the nav set, the page set and the open pointer', () => {
    writeWindowsState(file)
    expect(readWindowsState()).toEqual(file)
  })

  it('round-trips a matrix window, which keeps no set of its own', () => {
    const matrix: WindowsFile = { navSet: null, pageSet: null, open: { kind: 'matrix' } }
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
  it('refuses a payload that is not an object', () => {
    expect(sanitizeWindows(null)).toBeNull()
    expect(sanitizeWindows('windows')).toBeNull()
  })

  it('a field it cannot read falls to its empty value rather than failing the file', () => {
    expect(sanitizeWindows({ navSet: 7, pageSet: null, open: 'yes' })).toEqual(EMPTY_WINDOWS)
  })

  it('a file written before the set was unified keeps its nav set and drops the rest', () => {
    expect(
      sanitizeWindows({
        navSet: { tabs: [{ target: { kind: 'page', id: 'p3' } }], activeIndex: 0 },
        origins: { p1: { tabs: [{ target: { kind: 'page', id: 'p2' } }], activeIndex: 0 } },
        open: { kind: 'page', originId: 'p1' },
      }),
    ).toEqual({
      navSet: { tabs: [{ target: { kind: 'page', id: 'p3' } }] },
      pageSet: null,
      open: { kind: 'page' },
    })
  })

  it('strips display fields and drops refs of no storable kind', () => {
    const clean = sanitizeWindows({
      navSet: {
        tabs: [
          { target: { kind: 'navwindow' } },
          { target: { kind: 'page', id: 'p1', path: 'stale.md' } },
          { target: { kind: 'space', id: 's1' } },
        ],
      },
      pageSet: null,
      open: { kind: 'weird' },
    })
    expect(clean?.navSet?.tabs).toEqual([
      { target: { kind: 'page', id: 'p1' } },
      { target: { kind: 'space', id: 's1' } },
    ])
    expect(clean?.open).toBeNull()
  })

  it('drops every stored ref a window tab cannot render', () => {
    const clean = sanitizeWindows({
      navSet: null,
      pageSet: {
        tabs: [
          { target: { kind: 'matrix' } },
          { target: { kind: 'collection', id: 'c1' } },
          { target: { kind: 'homepage' } },
          { target: { kind: 'page', id: 'p1' } },
        ],
      },
      open: { kind: 'matrix' },
    })
    expect(clean?.pageSet?.tabs).toEqual([{ target: { kind: 'page', id: 'p1' } }])
    expect(clean?.open).toEqual({ kind: 'matrix' })
  })
})
