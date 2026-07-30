import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_PREVIEWS, type PreviewsFile } from '@shared/types'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { readPreviewsState, writePreviewsState } from './previewState'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'previews-'))
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

const file: PreviewsFile = {
  navSet: { tabs: [{ target: { kind: 'navwindow' } }], activeIndex: 0 },
  origins: {
    p1: { tabs: [{ target: { kind: 'page', id: 'p2' } }], activeIndex: 0 },
  },
  open: { flavor: 'page', originId: 'p1' },
}

describe('readPreviewsState', () => {
  it('reads the empty shape before anything is written', () => {
    expect(readPreviewsState()).toEqual(EMPTY_PREVIEWS)
  })

  it('round-trips the nav set, the per-origin sets and the open pointer', () => {
    writePreviewsState(file)
    expect(readPreviewsState()).toEqual(file)
  })

  it('a rewrite replaces the row', () => {
    writePreviewsState(file)
    writePreviewsState(EMPTY_PREVIEWS)
    expect(readPreviewsState()).toEqual(EMPTY_PREVIEWS)
  })

  it('reads the empty shape with no database open', () => {
    writePreviewsState(file)
    closeSessionDb()
    expect(readPreviewsState()).toEqual(EMPTY_PREVIEWS)
  })
})
