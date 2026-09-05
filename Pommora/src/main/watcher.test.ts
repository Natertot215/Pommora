import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BrowserWindow } from 'electron'
import { dropLiveTree, getLiveTree, refreshTree } from './liveTree'
import { push } from './ipc'
import { sessionRoot } from './session'
import { ignoredUnder, startWatcher, stopWatcher } from './watcher'

vi.mock('./ipc', () => ({ push: vi.fn() }))
vi.mock('./session', () => ({ sessionRoot: vi.fn() }))

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
// After the fake-timer debounce fires, the settle's apply work runs on real time — poll for
// the outcome (with a hard ceiling) rather than sleeping a fixed budget a loaded suite can
// overrun; a no-outcome caller gets the ceiling's worth of quiet.
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
  root = await mkdtemp(join(tmpdir(), 'pom-watchglue-'))
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
    expect(channels).toEqual(['nexus:changed', 'values:changed'])
    expect(pushMock.mock.calls[0][2]).toBe(getLiveTree())
    expect(pushMock.mock.calls[1][2]).toEqual([{ rel: 'Notes', pageIds: [ULID_B, ULID_C] }])
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
    await writeFile(abs('.nexus', 'state.json'), JSON.stringify({ collection_order: ['c1'] }))
    emit('add', 'Notes', 'B.md')
    emit('change', '.nexus', 'state.json')
    await settleAll(() => pushMock.mock.calls.length > 0)
    const channels = pushMock.mock.calls.map((c) => c[1])
    expect(channels).toEqual(['nexus:changed', 'values:changed'])
    expect(pushMock.mock.calls[0][2]).toBe(getLiveTree())
    expect(pushMock.mock.calls[1][2]).toEqual([{ rel: 'Notes', pageIds: [] }])
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
    await writeFile(abs('.nexus', 'state.json'), JSON.stringify({ collection_order: ['c1'] }))
    emit('change', '.nexus', 'homepage', '_tiles.json')
    emit('change', '.nexus', 'homepage', '_tiles.json')
    emit('change', '.nexus', 'state.json')
    await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'tiles:changed'))
    const tiles = pushMock.mock.calls.filter((c) => c[1] === 'tiles:changed')
    expect(tiles).toHaveLength(1)
    expect(tiles[0][2]).toEqual({ kind: 'homepage' })
  })
})

describe('ignoredUnder', () => {
  const ignored = (...segs: string[]): boolean =>
    ignoredUnder('/nexus', { excluded: [], assetDir: '' })(join('/nexus', ...segs))

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

  it('watches a host document but never a tile body — and lets chokidar descend into the homepage folder', () => {
    expect(ignored('.nexus', 'homepage')).toBe(false)
    expect(ignored('.nexus', 'homepage', '_tiles.json')).toBe(false)
    expect(ignored('.nexus', 'homepage', '01ARZ3NDEKPSV4RRFFQ69G5FAV.md')).toBe(true)
    expect(ignored('.nexus', 'contexts', 'Areas', 'Home', '_tiles.json')).toBe(false)
    expect(ignored('.nexus', 'contexts', 'Areas', 'Home', '01ARZ3NDEKPSV4RRFFQ69G5FAV.md')).toBe(
      true,
    )
  })
})
