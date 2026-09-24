import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { valueOr } from '@pommora/core/Contract/result'
import type { HostContext } from '../Contract/handlers'
import { closeSession, openSession } from '../Nexus/session'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { scopeGet, scopeSet } from './handlers'

const ctx = {} as HostContext

beforeEach(async () => {
  installStores(memoryStores().stores)
  await openSession('/nexus')
})
afterEach(() => {
  closeSession()
  installStores(NO_STORES)
})

const isShown = (v: unknown): v is boolean | null => typeof v === 'boolean' || v === null
const write = scopeSet('citations', isShown, 'Shown must be a boolean.')
const set = (key: string, value: boolean | null) => write(ctx, key, value)
const get = scopeGet<boolean>('citations')

describe('the citations override refuses what it cannot store and clears on a null', () => {
  it('stores both settings a page can be pinned to', () => {
    expect(set('page-1', true).ok).toBe(true)
    expect(set('page-2', false).ok).toBe(true)
    expect(valueOr(get(ctx), {})).toEqual({ 'page-1': true, 'page-2': false })
  })

  it('a null deletes the row rather than storing one, so the default reaches the page again', () => {
    set('page-1', true)
    expect(set('page-1', null).ok).toBe(true)
    expect(valueOr(get(ctx), {})).toEqual({})
  })

  it('refuses a non-boolean with a structured error and writes nothing', () => {
    const r = set('page-1', 'yes' as unknown as boolean)
    expect(r.ok).toBe(false)
    expect(valueOr(get(ctx), {})).toEqual({})
  })
})
