import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '@pommora/core/Paths/posix'
import { tempRoot } from '@pommora/core/Testing/hostFs'
import type { BrowserWindow } from 'electron'
import { dropLiveTree, getLiveTree, refreshTree } from '@pommora/core/Nexus/liveTree'
import { recordWrite } from '@pommora/core/Files/writeEcho'
import { forgetLastReads } from '@pommora/core/Files/atomicWrite'
import { push } from '../Bridge/ipc'
import { sessionRoot } from '@pommora/core/Nexus/session'
import { syncIgnoredUnder } from '@pommora/core/Nexus/watchSettle'
import { tileBodyUnder } from '@pommora/core/Nexus/watchPatch'
import chokidar from 'chokidar'
import { startWatcher, stopWatcher, waitUntilReadable } from './watcher'
import { installStores, NO_STORES } from '@pommora/core/Platform/stores'
import { memoryStores } from '@pommora/core/Testing/memoryStores'
import * as indexSeed from '@pommora/core/Index/indexSeed'
import { seedContentIndex } from '@pommora/core/Index/indexSeed'
import { flushValueWrites, noteValueWrite } from '@pommora/core/Nexus/valuesChanged'

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
const open = { isDestroyed: () => false } as BrowserWindow
let live: BrowserWindow | null = open
const win = (): BrowserWindow | null => live

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
  live = open
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

  it('a patch that throws mid-batch walks instead, so the held tree still reaches the disk', async () => {
    await startWatcher(root, win)
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    const reading = vi
      .spyOn(indexSeed, 'indexWrittenPage')
      .mockRejectedValueOnce(new Error('mid-read'))
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    emit('add', 'Notes', 'B.md')
    await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'nexus:changed'))
    reading.mockRestore()
    logged.mockRestore()
    expect(getLiveTree()?.collections[0]?.pages.map((p) => p.id)).toEqual([ULID_A, ULID_B])
    expect(pushMock.mock.calls.find((c) => c[1] === 'nexus:changed')?.[2]).toBe(getLiveTree())
  })

  it('pushes nothing when the batch changes nothing anyone renders', async () => {
    await startWatcher(root, win)
    await writeFile(abs('Loose', 'x.md'), 'loose\n')
    emit('add', 'Loose', 'x.md')
    await settleAll()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('leaves the value writes a mutation noted to that mutation’s own flush', async () => {
    await startWatcher(root, win)
    noteValueWrite(root, abs('Notes', 'A.md'))
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    emit('add', 'Notes', 'B.md')
    await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'values:changed'))
    expect(pushMock.mock.calls.find((c) => c[1] === 'values:changed')?.[2]).toEqual([
      { rel: 'Notes', pageIds: [ULID_B] },
    ])
    expect(flushValueWrites(root)).toEqual([{ rel: 'Notes', pageIds: [ULID_A] }])
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

  it('an external heading rename pushes the linker it rewrote and takes only its own value notes', async () => {
    vi.useRealTimers()
    installStores(memoryStores().stores)
    try {
      await mkdir(abs('Other'), { recursive: true })
      await writeFile(abs('Other', '_pagecollection.json'), JSON.stringify({ id: 'c2' }))
      await writeFile(abs('Other', 'B.md'), `---\nID: ${ULID_B}\n---\n\n[[A#Setup]]\n`)
      await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n`)
      await writeFile(abs('Notes', 'C.md'), `---\nID: ${ULID_C}\n---\n\ngamma\n`)
      await seedContentIndex(root)
      await refreshTree(root)
      vi.useFakeTimers()
      await startWatcher(root, win)
      noteValueWrite(root, abs('Notes', 'C.md'))
      await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Intro\n`)
      emit('change', 'Notes', 'A.md')
      await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'values:changed'))
      const payload = (channel: string): unknown =>
        pushMock.mock.calls.find((c) => c[1] === channel)?.[2]
      expect(payload('pages:changed')).toContain('Other/B.md')
      expect(payload('values:changed')).toContainEqual({ rel: 'Other', pageIds: [ULID_B] })
      expect(await readFile(abs('Other', 'B.md'), 'utf8')).toContain('[[A#Intro]]')
      expect(flushValueWrites(root)).toEqual([{ rel: 'Notes', pageIds: [ULID_C] }])
    } finally {
      installStores(NO_STORES)
    }
  })

  it('a heading rename whose cascade throws still lands the rest of its batch', async () => {
    vi.useRealTimers()
    installStores(memoryStores().stores)
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await mkdir(abs('Other'), { recursive: true })
      await writeFile(abs('Other', '_pagecollection.json'), JSON.stringify({ id: 'c2' }))
      await writeFile(abs('Other', 'B.md'), `---\nID: ${ULID_B}\n---\n\n[[A#Setup]]\n`)
      await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n`)
      await seedContentIndex(root)
      await refreshTree(root)
      forgetLastReads()
      await writeFile(abs('.nexus', 'properties.json'), '{corrupt')
      vi.useFakeTimers()
      await startWatcher(root, win)
      await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Intro\n`)
      await writeFile(abs('Notes', 'C.md'), `---\nID: ${ULID_C}\n---\n\ngamma\n`)
      emit('change', 'Notes', 'A.md')
      emit('add', 'Notes', 'C.md')
      await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'pages:changed'))
      expect(pushMock.mock.calls.find((c) => c[1] === 'pages:changed')?.[2]).toContain('Notes/C.md')
      expect(logged).toHaveBeenCalled()
    } finally {
      logged.mockRestore()
      installStores(NO_STORES)
    }
  })
})

describe('overlapping watcher starts', () => {
  it('arm one watcher: the last start wins', async () => {
    const watch = vi.mocked(chokidar.watch)
    watch.mockClear()
    await Promise.all([startWatcher(root, win), startWatcher(root, win)])
    expect(watch).toHaveBeenCalledTimes(1)
  })
})

describe('a waiting open', () => {
  const settings = (): string => abs('.nexus', 'settings.json')
  const waiting = () => ({ root, path: `${root}-raw`, why: 'Couldn’t read “settings.json”.' })
  const reopen = vi.fn()
  beforeEach(async () => {
    reopen.mockClear()
    rootMock.mockReturnValue(null)
    forgetLastReads()
    await writeFile(settings(), '{ corrupt')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('watches .nexus alone, and reopens by the raw path only once the files read', async () => {
    const watch = vi.mocked(chokidar.watch)
    watch.mockClear()
    waitUntilReadable(waiting(), reopen)
    expect(watch).toHaveBeenCalledWith(abs('.nexus'), { depth: 0 })
    emit('all', '.nexus', 'settings.json')
    await settleAll()
    expect(reopen).not.toHaveBeenCalled()
    await writeFile(settings(), '{}')
    emit('all', '.nexus', 'settings.json')
    await settleAll(() => reopen.mock.calls.length > 0)
    expect(reopen).toHaveBeenCalledWith(`${root}-raw`)
  })

  it('a watcher started after it supersedes it', async () => {
    waitUntilReadable(waiting(), reopen)
    await writeFile(settings(), '{}')
    emit('all', '.nexus', 'settings.json')
    rootMock.mockReturnValue(root)
    await startWatcher(root, win)
    await settleAll()
    expect(reopen).not.toHaveBeenCalled()
  })

  it('a start for a root other than the session’s leaves it armed', async () => {
    waitUntilReadable(waiting(), reopen)
    await startWatcher(root, win)
    await writeFile(settings(), '{}')
    emit('all', '.nexus', 'settings.json')
    await settleAll(() => reopen.mock.calls.length > 0)
    expect(reopen).toHaveBeenCalledWith(`${root}-raw`)
  })
})

describe('the watcher with the window closed', () => {
  it('keeps patching the tree, so a reopened window reads what changed meanwhile', async () => {
    await startWatcher(root, win)
    live = null
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    emit('add', 'Notes', 'B.md')
    await settleAll(() => getLiveTree()?.collections[0]?.pages.length === 2)
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

  it('pushes the host for an outside edit to a tile body, and nothing for its own write', async () => {
    await startWatcher(root, win)
    await mkdir(abs('.nexus', 'homepage'), { recursive: true })
    recordWrite(abs('.nexus', 'homepage', `${ULID_B}.md`), 'typed')
    await writeFile(abs('.nexus', 'homepage', `${ULID_B}.md`), 'typed')
    emit('change', '.nexus', 'homepage', `${ULID_B}.md`)
    await settleAll()
    expect(pushMock.mock.calls.filter((c) => c[1] === 'tiles:changed')).toEqual([])
    await writeFile(abs('.nexus', 'homepage', `${ULID_B}.md`), 'synced')
    emit('change', '.nexus', 'homepage', `${ULID_B}.md`)
    await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'tiles:changed'))
    expect(pushMock.mock.calls.map((c) => c[1])).toEqual(['tiles:changed'])
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

describe('a page the app just wrote', () => {
  const own = `---\nID: ${ULID_A}\n---\n\nalpha\n`
  const changedPages = (): unknown[] =>
    pushMock.mock.calls.filter((c) => c[1] === 'pages:changed').map((c) => c[2])

  it('drops its own echo', async () => {
    await startWatcher(root, win)
    recordWrite(abs('Notes', 'A.md'), own)
    emit('change', 'Notes', 'A.md')
    await settleAll()
    expect(changedPages()).toEqual([])
  })

  it('lands an outside edit inside the echo window', async () => {
    await startWatcher(root, win)
    recordWrite(abs('Notes', 'A.md'), own)
    await writeFile(abs('Notes', 'A.md'), `${own}outside\n`)
    emit('change', 'Notes', 'A.md')
    await settleAll(() => changedPages().length > 0)
    expect(changedPages()).toEqual([['Notes/A.md']])
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
  const tileBody = (...segs: string[]): boolean => tileBodyUnder(segs, segs.join('/'))

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
