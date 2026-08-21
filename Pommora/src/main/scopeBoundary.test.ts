import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('electron', () => ({ BrowserWindow: class {}, ipcMain: { handle: vi.fn(), on: vi.fn() } }))

import { openSessionDb, closeSessionDb } from './sessionDb'
import { scopeGet, scopeSet } from './ipc'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-scope-boundary-'))
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

const isShown = (v: unknown): v is boolean | null => typeof v === 'boolean' || v === null
const set = scopeSet('citations', isShown, 'Shown must be a boolean.')
const get = scopeGet<boolean>('citations')

describe('the citations override refuses what it cannot store and clears on a null', () => {
  it('stores both settings a page can be pinned to', () => {
    expect(set('page-1', true).ok).toBe(true)
    expect(set('page-2', false).ok).toBe(true)
    expect(get()).toEqual({ 'page-1': true, 'page-2': false })
  })

  it('a null deletes the row rather than storing one, so the default reaches the page again', () => {
    set('page-1', true)
    expect(set('page-1', null).ok).toBe(true)
    expect(get()).toEqual({})
  })

  it('refuses a non-boolean with a structured error and writes nothing', () => {
    const r = set('page-1', 'yes' as unknown as boolean)
    expect(r.ok).toBe(false)
    expect(get()).toEqual({})
  })
})
