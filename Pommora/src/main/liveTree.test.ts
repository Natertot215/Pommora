import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NexusTree } from '@shared/types'
import { dropLiveTree, getLiveTree, patchLiveTree, refreshTree } from './liveTree'
import { readNexus } from './readNexus'
import { pathExists } from './IO/atomicWrite'

vi.mock('./readNexus', () => ({ readNexus: vi.fn() }))
vi.mock('./IO/atomicWrite', () => ({ pathExists: vi.fn() }))

const walk = vi.mocked(readNexus)
const exists = vi.mocked(pathExists)

const T = (name: string): NexusTree => ({ nexus: { id: name } }) as unknown as NexusTree

function deferred<V>(): {
  promise: Promise<V>
  resolve: (v: V) => void
  reject: (e: unknown) => void
} {
  let resolve!: (v: V) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<V>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  dropLiveTree()
  walk.mockReset()
  exists.mockReset()
})

describe('refreshTree', () => {
  it('is single-flight: two concurrent refreshes share one walk', async () => {
    const d = deferred<NexusTree>()
    walk.mockReturnValueOnce(d.promise)
    const a = refreshTree('/r')
    const b = refreshTree('/r')
    const tA = T('a')
    d.resolve(tA)
    expect(await a).toBe(tA)
    expect(await b).toBe(tA)
    expect(walk).toHaveBeenCalledTimes(1)
    expect(getLiveTree()).toBe(tA)
  })

  it('a mutation landing mid-walk discards the result and re-walks', async () => {
    const d = deferred<NexusTree>()
    const tStale = T('stale')
    const tFresh = T('fresh')
    walk.mockReturnValueOnce(d.promise).mockResolvedValueOnce(tFresh)
    const p = refreshTree('/r')
    patchLiveTree(() => null)
    d.resolve(tStale)
    expect(await p).toBe(tFresh)
    expect(walk).toHaveBeenCalledTimes(2)
    expect(getLiveTree()).toBe(tFresh)
  })

  it('a root switch mid-walk discards the result', async () => {
    const d = deferred<NexusTree>()
    walk.mockReturnValueOnce(d.promise)
    const p = refreshTree('/a')
    dropLiveTree()
    d.resolve(T('a'))
    await p
    expect(getLiveTree()).toBeNull()
    const tB = T('b')
    walk.mockResolvedValueOnce(tB)
    expect(await refreshTree('/b')).toBe(tB)
    expect(getLiveTree()).toBe(tB)
  })

  it('a transient rejection keeps the held tree and clears the slot for a retry', async () => {
    const tA = T('a')
    walk.mockResolvedValueOnce(tA)
    await refreshTree('/r')
    walk.mockRejectedValueOnce(new Error('EBUSY'))
    exists.mockResolvedValueOnce(true)
    await expect(refreshTree('/r')).rejects.toThrow('EBUSY')
    expect(getLiveTree()).toBe(tA)
    const tB = T('b')
    walk.mockResolvedValueOnce(tB)
    expect(await refreshTree('/r')).toBe(tB)
  })

  it('a rejection over a missing root drops the held tree', async () => {
    const tA = T('a')
    walk.mockResolvedValueOnce(tA)
    await refreshTree('/r')
    walk.mockRejectedValueOnce(new Error('Nexus root not found: /r'))
    exists.mockResolvedValueOnce(false)
    await expect(refreshTree('/r')).rejects.toThrow('not found')
    expect(getLiveTree()).toBeNull()
  })
})

describe('patchLiveTree', () => {
  it('installs the patched tree and serves it by identity', async () => {
    const tA = T('a')
    walk.mockResolvedValueOnce(tA)
    await refreshTree('/r')
    const next = patchLiveTree((t) => ({ ...t }))
    expect(next).not.toBeNull()
    expect(next).not.toBe(tA)
    expect(getLiveTree()).toBe(next)
  })

  it('signals fallback with null when the patch cannot resolve, leaving the tree held', async () => {
    const tA = T('a')
    walk.mockResolvedValueOnce(tA)
    await refreshTree('/r')
    expect(patchLiveTree(() => null)).toBeNull()
    expect(getLiveTree()).toBe(tA)
  })

  it('returns null on a held nothing without invoking the patch', () => {
    const fn = vi.fn()
    expect(patchLiveTree(fn)).toBeNull()
    expect(fn).not.toHaveBeenCalled()
  })
})
