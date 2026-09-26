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
  sets: {
    nav: { tabs: [{ target: { kind: 'page', id: 'p3' } }] },
    page: { tabs: [{ target: { kind: 'space', id: 's1' } }] },
  },
}

describe('readWindowsState', () => {
  it('reads the empty shape before anything is written', () => {
    expect(readWindowsState()).toEqual(EMPTY_WINDOWS)
  })

  it("round-trips each kind's set", () => {
    writeWindowsState(file)
    expect(readWindowsState()).toEqual(file)
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

  it('a set it cannot read drops alone rather than failing the file', () => {
    expect(sanitizeWindows({ sets: { nav: 7, page: { tabs: [] } } })).toEqual({
      sets: { page: { tabs: [] } },
    })
  })

  it('a file of the old named-set shape reads as empty', () => {
    expect(
      sanitizeWindows({
        navSet: { tabs: [{ target: { kind: 'page', id: 'p3' } }] },
        pageSet: null,
      }),
    ).toEqual(EMPTY_WINDOWS)
  })

  it('strips display fields and drops refs of no storable kind', () => {
    const clean = sanitizeWindows({
      sets: {
        nav: {
          tabs: [
            { target: { kind: 'map' } },
            { target: { kind: 'page', id: 'p1', path: 'stale.md' } },
            { target: { kind: 'space', id: 's1' } },
          ],
        },
      },
    })
    expect(clean?.sets.nav?.tabs).toEqual([
      { target: { kind: 'page', id: 'p1' } },
      { target: { kind: 'space', id: 's1' } },
    ])
  })

  it('drops every stored ref a window tab cannot render', () => {
    const clean = sanitizeWindows({
      sets: {
        page: {
          tabs: [
            { target: { kind: 'matrix' } },
            { target: { kind: 'collection', id: 'c1' } },
            { target: { kind: 'homepage' } },
            { target: { kind: 'page', id: 'p1' } },
          ],
        },
      },
    })
    expect(clean?.sets.page?.tabs).toEqual([{ target: { kind: 'page', id: 'p1' } }])
  })
})
