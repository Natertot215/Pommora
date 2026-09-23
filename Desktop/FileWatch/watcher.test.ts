import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from '@pommora/core/Paths/posix'
import { tempRoot } from '@pommora/core/Testing/hostFs'
import type { BrowserWindow } from 'electron'
import { dropLiveTree, getLiveTree, refreshTree } from '@pommora/core/Nexus/liveTree'
import { recordWrite } from '@pommora/core/Files/writeEcho'
import { push } from '../Bridge/ipc'
import { sessionRoot } from '@pommora/core/Nexus/session'
import { syncIgnoredUnder, tileBodyOf } from '@pommora/core/Nexus/watchSettle'
import { startWatcher, stopWatcher } from './watcher'

vi.mock('../Bridge/ipc', () => ({ push: vi.fn() }))
vi.mock('@pommora/core/Nexus/session', () => ({ sessionRoot: vi.fn() }))

type Handler = (path: string) => void
const handlers = new Map<string, Handler>()

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => {
      const fake = {
        on: (name: string, fn: Handler) => {
          handlers.set(name, fn)
          return fake
        },
        close: () => Promise.resolve(),
      }
      return fake
    }),
  },
}))

const pushMock = vi.mocked(push)
const rootMock = vi.mocked(sessionRoot)
const win = { isDestroyed: () => false } as BrowserWindow

const ULID_A = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKPCTAV9WEVGEMMVRZ'
const ULID_C = '01CX5ZZKBKPCTAV9WEVGEMMVRC'

let root: string
const abs = (...segs: string[]): string => join(root, ...segs)
const emit = (event: string, ...segs: string[]): void => handlers.get(event)?.(abs(...segs))
// After the fake-timer debounce fires, the settle's apply work runs on real time — poll for the outcome (with a hard ceiling) rather than sleeping a fixed budget a loaded suite can overrun.
const settleAll = async (until?: () => boolean): Promise<void> => {
  await vi.advanceTimersByTimeAsync(250)
  vi.useRealTimers()
  const deadline = Date.now() + (until ? 3000 : 300)
  do {
    await new Promise((r) => setTimeout(r, 20))
  } while (Date.now() < deadline && !until?.())
  vi.useFakeTimers()
}

beforeEach(async () => {
  root = tempRoot('pom-watchglue-')
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\nalpha\n`)
  await mkdir(abs('Loose'), { recursive: true })
  rootMock.mockReturnValue(root)
  pushMock.mockClear()
  handlers.clear()
  await refreshTree(root)
  vi.useFakeTimers()
})
afterEach(async () => {
  vi.useRealTimers()
  stopWatcher()
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('the watcher settle', () => {
  it('accumulates a batch into one patched push', async () => {
    await startWatcher(root, win)
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(abs('Notes', 'C.md'), `---\nID: ${ULID_C}\n---\n\ngamma\n`)
    emit('add', 'Notes', 'B.md')
    emit('add', 'Notes', 'C.md')
    await settleAll(() => pushMock.mock.calls.length > 0)
    const channels = pushMock.mock.calls.map((c) => c[1])
    expect(channels).toEqual(['nexus:changed', 'pages:changed', 'values:changed'])
    expect(pushMock.mock.calls[0][2]).toBe(getLiveTree())
    expect(pushMock.mock.calls[1][2]).toEqual(['Notes/B.md', 'Notes/C.md'])
    expect(pushMock.mock.calls[2][2]).toEqual([{ rel: 'Notes', pageIds: [ULID_B, ULID_C] }])
    expect(getLiveTree()?.collections[0]?.pages).toHaveLength(3)
  })

  it('pushes nothing when the batch changes nothing anyone renders', async () => {
    await startWatcher(root, win)
    await writeFile(abs('Loose', 'x.md'), 'loose\n')
    emit('add', 'Loose', 'x.md')
    await settleAll()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('a mixed batch lands as one walk, pushed once', async () => {
    await startWatcher(root, win)
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
    emit('add', 'Notes', 'B.md')
    emit('change', '.nexus', 'nexus.json')
    await settleAll(() => pushMock.mock.calls.length > 0)
    const channels = pushMock.mock.calls.map((c) => c[1])
    expect(channels).toEqual(['nexus:changed', 'pages:changed', 'values:changed'])
    expect(pushMock.mock.calls[0][2]).toBe(getLiveTree())
    expect(pushMock.mock.calls[1][2]).toEqual(['Notes/B.md'])
    expect(pushMock.mock.calls[2][2]).toEqual([{ rel: 'Notes', pageIds: [] }])
    expect(
      getLiveTree()
        ?.collections[0]?.pages.map((p) => p.title)
        .sort(),
    ).toEqual(['A', 'B'])
  })
})

describe('a host document under the watcher', () => {
  it('pushes the host once even when the batch also forces a walk', async () => {
    await startWatcher(root, win)
    await mkdir(abs('.nexus', 'homepage'), { recursive: true })
    await writeFile(abs('.nexus', 'homepage', '_tiles.json'), '{}')
    await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
    emit('change', '.nexus', 'homepage', '_tiles.json')
    emit('change', '.nexus', 'homepage', '_tiles.json')
    emit('change', '.nexus', 'nexus.json')
    await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'tiles:changed'))
    const tiles = pushMock.mock.calls.filter((c) => c[1] === 'tiles:changed')
    expect(tiles).toHaveLength(1)
    expect(tiles[0][2]).toEqual({ kind: 'homepage' })
  })
})

describe('state.json under the watcher', () => {
  it('lands an outside edit inside the echo window: navigation pushed once, order patched without a walk', async () => {
    await mkdir(abs('Other'), { recursive: true })
    await writeFile(abs('Other', '_pagecollection.json'), JSON.stringify({ id: 'c2' }))
    vi.useRealTimers()
    await refreshTree(root)
    vi.useFakeTimers()
    await startWatcher(root, win)
    const nav = { pinned: [{ kind: 'homepage' }] }
    recordWrite(abs('.nexus', 'state.json'))
    await writeFile(
      abs('.nexus', 'state.json'),
      JSON.stringify({ navigation: nav, order: { collections: ['c2', 'c1'] } }),
    )
    emit('change', '.nexus', 'state.json')
    emit('change', '.nexus', 'state.json')
    await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'nexus:changed'))
    emit('change', '.nexus', 'state.json')
    await settleAll()
    const channels = pushMock.mock.calls.map((c) => c[1])
    expect(channels.filter((c) => c === 'nav:changed')).toHaveLength(1)
    expect(pushMock.mock.calls.find((c) => c[1] === 'nav:changed')?.[2]).toEqual(nav)
    expect(channels.filter((c) => c === 'nexus:changed')).toHaveLength(1)
    expect(getLiveTree()?.collections.map((c) => c.id)).toEqual(['c2', 'c1'])
  })

  it('an order that did not move pushes no tree', async () => {
    await startWatcher(root, win)
    const before = getLiveTree()
    await writeFile(abs('.nexus', 'state.json'), JSON.stringify({ order: { collections: ['c1'] } }))
    emit('change', '.nexus', 'state.json')
    await settleAll()
    expect(pushMock.mock.calls.map((c) => c[1])).toEqual(['nav:changed'])
    expect(getLiveTree()).toBe(before)
  })
})

describe('a metadata month file under the watcher', () => {
  it('lands an outside edit inside the echo window', async () => {
    vi.useRealTimers()
    await refreshTree(root)
    vi.useFakeTimers()
    await startWatcher(root, win)
    const id = '01KZSWEW0WPF1PFWWJSKE8Q83P'
    await mkdir(abs('.nexus', 'metadata'), { recursive: true })
    recordWrite(abs('.nexus', 'metadata', '08-2026.json'))
    await writeFile(
      abs('.nexus', 'metadata', '08-2026.json'),
      JSON.stringify({ pages: { [id]: { locked: true } } }),
    )
    emit('change', '.nexus', 'metadata', '08-2026.json')
    await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'nexus:changed'))
    expect(pushMock.mock.calls.filter((c) => c[1] === 'nexus:changed')).toHaveLength(1)
    expect(getLiveTree()?.pageMetadata).toEqual({ [id]: { locked: true } })
  })
})

describe('syncIgnoredUnder', () => {
  const ignored = (...segs: string[]): boolean =>
    syncIgnoredUnder('/nexus', { excluded: [], assetDir: '' })(join('/nexus', ...segs))
  const tileBody = (...segs: string[]): boolean => tileBodyOf('/nexus')(join('/nexus', ...segs))

  it('ignores a store, its journal, and a quarantined store wherever it sits, and nothing else under .nexus', () => {
    expect(ignored('.nexus', 'versions.db')).toBe(true)
    expect(ignored('.nexus', 'versions.db-wal')).toBe(true)
    expect(ignored('.nexus', 'versions.db-shm')).toBe(true)
    expect(ignored('.nexus', 'versions.corrupt-2026-09-03T00-00-00-000Z.db')).toBe(true)
    expect(ignored('.nexus', 'versions.corrupt-2026-09-03T00-00-00-000Z.db-wal')).toBe(true)
    expect(ignored('.nexus', 'settings.json')).toBe(false)
    expect(ignored('Notes', 'report.db')).toBe(true)
    expect(ignored('Notes', 'report.md')).toBe(false)
  })

  it('reports a tile body the tree then drops, and lets chokidar descend into the homepage folder', () => {
    for (const segs of [
      ['.nexus', 'homepage'],
      ['.nexus', 'homepage', '_tiles.json'],
      ['.nexus', 'homepage', '01ARZ3NDEKPSV4RRFFQ69G5FAV.md'],
      ['.nexus', 'contexts', 'Areas', 'Home', '_tiles.json'],
      ['.nexus', 'contexts', 'Areas', 'Home', '01ARZ3NDEKPSV4RRFFQ69G5FAV.md'],
    ])
      expect(ignored(...segs)).toBe(false)
    expect(tileBody('.nexus', 'homepage', '_tiles.json')).toBe(false)
    expect(tileBody('.nexus', 'homepage', '01ARZ3NDEKPSV4RRFFQ69G5FAV.md')).toBe(true)
    expect(tileBody('.nexus', 'contexts', 'Areas', 'Home', '_tiles.json')).toBe(false)
    expect(tileBody('.nexus', 'contexts', 'Areas', 'Home', '01ARZ3NDEKPSV4RRFFQ69G5FAV.md')).toBe(
      true,
    )
  })
})
