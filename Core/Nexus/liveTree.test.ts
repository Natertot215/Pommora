import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NexusTree } from './tree'
import {
  dropLiveTree,
  heldTreeOf,
  patchLiveTree,
  refreshTree,
  seedLiveTree,
  setCommandsTap,
} from './liveTree'
import { readNexus } from './readNexus'
import { pathExists } from '../Files/atomicWrite'

vi.mock('./readNexus', () => ({ readNexus: vi.fn() }))
vi.mock('../Files/atomicWrite', () => ({ pathExists: vi.fn() }))
let open = '/r'
vi.mock('./session', () => ({ sessionRoot: () => open }))

const walk = vi.mocked(readNexus)
const exists = vi.mocked(pathExists)

const T = (name: string, rootPath = '/r'): NexusTree =>
  ({ nexus: { id: name, rootPath }, config: {} }) as unknown as NexusTree

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
  open = '/r'
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
    expect(heldTreeOf('/r')).toBe(tA)
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
    expect(heldTreeOf('/r')).toBe(tFresh)
  })

  it('a root switch mid-walk discards the result', async () => {
    const d = deferred<NexusTree>()
    walk.mockReturnValueOnce(d.promise)
    open = '/a'
    const p = refreshTree('/a')
    dropLiveTree()
    open = '/b'
    d.resolve(T('a', '/a'))
    await p
    expect(heldTreeOf('/a')).toBeNull()
    const tB = T('b', '/b')
    walk.mockResolvedValueOnce(tB)
    expect(await refreshTree('/b')).toBe(tB)
    expect(heldTreeOf('/b')).toBe(tB)
  })

  it('a walk of the previous root, asked after a switch, reads it without replacing the open walk', async () => {
    open = '/b'
    const dB = deferred<NexusTree>()
    const tA = T('a', '/a')
    const tB = T('b', '/b')
    walk.mockReturnValueOnce(dB.promise).mockResolvedValueOnce(tA)
    const opening = refreshTree('/b')
    expect(await refreshTree('/a')).toBe(tA)
    dB.resolve(tB)
    expect(await opening).toBe(tB)
    expect(heldTreeOf('/b')).toBe(tB)
  })

  it('a transient rejection keeps the held tree and clears the slot for a retry', async () => {
    const tA = T('a')
    walk.mockResolvedValueOnce(tA)
    await refreshTree('/r')
    walk.mockRejectedValueOnce(new Error('EBUSY'))
    exists.mockResolvedValueOnce(true)
    await expect(refreshTree('/r')).rejects.toThrow('EBUSY')
    expect(heldTreeOf('/r')).toBe(tA)
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
    expect(heldTreeOf('/r')).toBeNull()
  })
})

describe('seedLiveTree', () => {
  it('a walk in flight when the open seeds its tree installs nothing over it', async () => {
    const d = deferred<NexusTree>()
    walk.mockReturnValueOnce(d.promise)
    const inFlight = refreshTree('/r')
    const seeded = T('seeded')
    seedLiveTree(seeded)
    d.resolve(T('walked'))
    await inFlight
    expect(heldTreeOf('/r')).toBe(seeded)
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
    expect(heldTreeOf('/r')).toBe(next)
  })

  it('signals fallback with null when the patch cannot resolve, leaving the tree held', async () => {
    const tA = T('a')
    walk.mockResolvedValueOnce(tA)
    await refreshTree('/r')
    expect(patchLiveTree(() => null)).toBeNull()
    expect(heldTreeOf('/r')).toBe(tA)
  })

  it('returns null on a held nothing without invoking the patch', () => {
    const fn = vi.fn()
    expect(patchLiveTree(fn)).toBeNull()
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('the commands tap', () => {
  const withCommands = (t: NexusTree, chord: string): NexusTree =>
    ({ ...t, config: { ...t.config, commands: { search: chord } } }) as unknown as NexusTree

  it('fires once for a patch that moves config.commands, and never for one that leaves it or a drop', async () => {
    const tap = vi.fn()
    setCommandsTap(tap)
    walk.mockResolvedValueOnce(withCommands(T('a'), 'Mod+F'))
    await refreshTree('/r')
    tap.mockClear()
    patchLiveTree((t) => withCommands(t, 'Mod+G'))
    expect(tap).toHaveBeenCalledTimes(1)
    patchLiveTree((t) => ({ ...t, config: { ...t.config } }))
    patchLiveTree((t) => withCommands(t, 'Mod+G'))
    dropLiveTree()
    expect(tap).toHaveBeenCalledTimes(1)
    setCommandsTap(null)
  })
})

describe('a patch mid-walk', () => {
  it('installs the walk across a patch that answers the held tree', async () => {
    const tA = T('a')
    walk.mockResolvedValueOnce(tA)
    await refreshTree('/r')
    const d = deferred<NexusTree>()
    const tB = T('b')
    walk.mockReturnValueOnce(d.promise)
    const p = refreshTree('/r')
    patchLiveTree((t) => t)
    d.resolve(tB)
    expect(await p).toBe(tB)
    expect(walk).toHaveBeenCalledTimes(2)
  })

  it('re-walks across a patch that changes the tree', async () => {
    const tA = T('a')
    walk.mockResolvedValueOnce(tA)
    await refreshTree('/r')
    const d = deferred<NexusTree>()
    const tStale = T('stale')
    const tFresh = T('fresh')
    walk.mockReturnValueOnce(d.promise).mockResolvedValueOnce(tFresh)
    const p = refreshTree('/r')
    patchLiveTree((t) => ({ ...t }))
    d.resolve(tStale)
    expect(await p).toBe(tFresh)
    expect(walk).toHaveBeenCalledTimes(3)
  })
})
