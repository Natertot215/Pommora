import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_WINDOWS, type WindowsFile } from '@shared/types'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { readWindowsState, sanitizeWindows, writeWindowsState } from './windowState'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'windows-'))
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

const file: WindowsFile = {
  navSet: { tabs: [{ target: { kind: 'page', id: 'p3' } }], activeIndex: 0 },
  origins: {
    p1: { tabs: [{ target: { kind: 'page', id: 'p2' } }], activeIndex: 0 },
  },
  open: { flavor: 'page', originId: 'p1' },
}

describe('readWindowsState', () => {
  it('reads the empty shape before anything is written', () => {
    expect(readWindowsState()).toEqual(EMPTY_WINDOWS)
  })

  it('round-trips the nav set, the per-origin sets and the open pointer', () => {
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
    closeSessionDb()
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
      open: { flavor: 'weird', originId: 'p1' },
    })
    expect(clean?.navSet?.tabs).toEqual([{ target: { kind: 'page', id: 'p1' } }])
    expect(clean?.open).toBeNull()
  })
})
