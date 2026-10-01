import { liveAssetMap } from '@pommora/core/Assets/assetMap'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '@pommora/core/Paths/posix'
import { noModeBits, tempRoot } from '@pommora/core/Testing/hostFs'
import type { BrowserWindow } from 'electron'
import * as liveTree from '@pommora/core/Nexus/liveTree'
import { dropLiveTree, getLiveTree, refreshTree } from '@pommora/core/Nexus/liveTree'
import { splitFrontmatter } from '@pommora/core/Files/pageFile'
import { ID_KEY, isUlidShaped } from '@pommora/core/Nexus/identityMark'
import { recordWrite } from '@pommora/core/Files/writeEcho'
import { forgetLastReads } from '@pommora/core/Files/atomicWrite'
import { push } from '../Bridge/ipc'
import { sessionRoot, type WaitingOpen, waitingOpen } from '@pommora/core/Nexus/session'
import { classifyEvent, tileBodyUnder } from '@pommora/core/Nexus/fileEvents'
import { sent } from '@pommora/core/Nexus/settle'
import { readIndexedStat } from '@pommora/core/Index/contentIndex'
import chokidar from 'chokidar'
import {
  isConfigPath,
  startWatcher,
  stopWatcher,
  syncIgnoredUnder,
  waitUntilReadable,
} from './watcher'
import { installStores, NO_STORES } from '@pommora/core/Platform/stores'
import { memoryStores } from '@pommora/core/Testing/memoryStores'
import * as indexSeed from '@pommora/core/Index/indexSeed'
import { seedContentIndex } from '@pommora/core/Index/indexSeed'

vi.mock('../Bridge/ipc', () => ({ push: vi.fn() }))
vi.mock('@pommora/core/Nexus/session', () => ({
  sessionRoot: vi.fn(),
  waitingOpen: vi.fn(),
  adopting: () => false,
}))

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
        close: () => {
          handlers.clear()
          return Promise.resolve()
        },
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
  sent(await refreshTree(root))
  await liveAssetMap(root)
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

  it('an index step that throws still lands its page, and the reseed it owes indexes it', async () => {
    vi.useRealTimers()
    installStores(memoryStores().stores)
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await seedContentIndex(root)
      vi.useFakeTimers()
      await startWatcher(root, win)
      await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
      const reading = vi
        .spyOn(indexSeed, 'indexWrittenPage')
        .mockRejectedValueOnce(new Error('mid-read'))
      emit('add', 'Notes', 'B.md')
      await settleAll(() => readIndexedStat('Notes/B.md') !== null)
      reading.mockRestore()
      expect(getLiveTree()?.collections[0]?.pages.map((p) => p.id)).toEqual([ULID_A, ULID_B])
      expect(pushMock.mock.calls.find((c) => c[1] === 'nexus:changed')?.[2]).toBe(getLiveTree())
      expect(readIndexedStat('Notes/B.md')).not.toBeNull()
    } finally {
      logged.mockRestore()
      installStores(NO_STORES)
    }
  })

  it('pushes nothing when the batch changes nothing anyone renders', async () => {
    await startWatcher(root, win)
    await writeFile(abs('Loose', 'x.txt'), 'loose\n')
    emit('add', 'Loose', 'x.txt')
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
    expect(pushMock.mock.calls[2][2]).toEqual([{ rel: 'Notes', pageIds: [ULID_B] }])
    expect(
      getLiveTree()
        ?.collections[0]?.pages.map((p) => p.title)
        .sort(),
    ).toEqual(['A', 'B'])
  })

  it('an external heading rename pushes the linker it rewrote', async () => {
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
      await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Intro\n`)
      emit('change', 'Notes', 'A.md')
      await settleAll(() => pushMock.mock.calls.some((c) => c[1] === 'values:changed'))
      const payload = (channel: string): unknown =>
        pushMock.mock.calls.find((c) => c[1] === channel)?.[2]
      expect(payload('pages:changed')).toContain('Other/B.md')
      expect(payload('values:changed')).toContainEqual({ rel: 'Other', pageIds: [ULID_B] })
      expect(await readFile(abs('Other', 'B.md'), 'utf8')).toContain('[[A#Intro]]')
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
  let waiting: WaitingOpen
  const reopen = vi.fn()
  beforeEach(async () => {
    waiting = { root, path: `${root}-raw`, why: 'Couldn’t read “settings.json”.' }
    vi.mocked(waitingOpen).mockReturnValue(waiting)
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
    waitUntilReadable(waiting, reopen)
    expect(watch).toHaveBeenCalledWith(abs('.nexus'), { depth: 0 })
    emit('all', '.nexus', 'settings.json')
    await settleAll()
    expect(reopen).not.toHaveBeenCalled()
    await writeFile(settings(), '{}')
    emit('all', '.nexus', 'settings.json')
    await settleAll(() => reopen.mock.calls.length > 0)
    expect(reopen).toHaveBeenCalledWith(`${root}-raw`)
  })

  it('reopens once, however many events follow while the open runs', async () => {
    waitUntilReadable(waiting, reopen)
    await writeFile(settings(), '{}')
    emit('all', '.nexus', 'settings.json')
    await settleAll(() => reopen.mock.calls.length > 0)
    emit('all', '.nexus', 'settings.json')
    await settleAll()
    expect(reopen).toHaveBeenCalledTimes(1)
  })

  it('an open that ends the wait while the files are read reopens nothing', async () => {
    waitUntilReadable(waiting, reopen)
    await writeFile(settings(), '{}')
    emit('all', '.nexus', 'settings.json')
    vi.mocked(waitingOpen).mockReturnValue(null)
    await settleAll()
    expect(reopen).not.toHaveBeenCalled()
  })

  it('a watcher started after it supersedes it', async () => {
    waitUntilReadable(waiting, reopen)
    await writeFile(settings(), '{}')
    emit('all', '.nexus', 'settings.json')
    rootMock.mockReturnValue(root)
    await startWatcher(root, win)
    await settleAll()
    expect(reopen).not.toHaveBeenCalled()
  })

  it('a start for a root other than the session’s leaves it armed', async () => {
    waitUntilReadable(waiting, reopen)
    await startWatcher(root, win)
    await writeFile(settings(), '{}')
    emit('all', '.nexus', 'settings.json')
    await settleAll(() => reopen.mock.calls.length > 0)
    expect(reopen).toHaveBeenCalledWith(`${root}-raw`)
  })
})

describe('a file made outside the app', () => {
  const idIn = async (...segs: string[]): Promise<unknown> =>
    splitFrontmatter(await readFile(abs(...segs), 'utf8'))[ID_KEY]

  it('an ID-less page is stamped and held without a walk', async () => {
    await startWatcher(root, win)
    const walks = vi.spyOn(liveTree, 'refreshAfterWrite')
    try {
      await writeFile(abs('Notes', 'B.md'), 'beta\n')
      emit('add', 'Notes', 'B.md')
      await settleAll(() => getLiveTree()?.collections[0]?.pages.length === 2)
      const id = await idIn('Notes', 'B.md')
      expect(isUlidShaped(id)).toBe(true)
      expect(getLiveTree()?.collections[0]?.pages.map((p) => p.id)).toContain(id)
      expect(walks).not.toHaveBeenCalled()
    } finally {
      walks.mockRestore()
    }
  })

  it('a nested folder with a page becomes a Set', async () => {
    await startWatcher(root, win)
    await mkdir(abs('Notes', 'Sub'))
    await writeFile(abs('Notes', 'Sub', 'P.md'), 'p\n')
    emit('addDir', 'Notes', 'Sub')
    emit('add', 'Notes', 'Sub', 'P.md')
    await settleAll(() => !!getLiveTree()?.collections[0]?.sets[0]?.pages.length)
    const sub = getLiveTree()?.collections[0]?.sets[0]
    const sidecar = JSON.parse(await readFile(abs('Notes', 'Sub', '_pageset.json'), 'utf8'))
    expect(sub?.id).toBe(sidecar.id)
    expect(sub?.pages.map((p) => p.id)).toEqual([await idIn('Notes', 'Sub', 'P.md')])
    expect(getLiveTree()?.unreadable).toBeUndefined()
  })

  it.skipIf(noModeBits)('a page in a read-only folder stays listed missing', async () => {
    await mkdir(abs('Notes', 'Locked'))
    await writeFile(abs('Notes', 'Locked', '_pageset.json'), JSON.stringify({ id: 's-locked' }))
    await refreshTree(root)
    await startWatcher(root, win)
    await writeFile(abs('Notes', 'Locked', 'P.md'), 'p\n')
    await chmod(abs('Notes', 'Locked'), 0o555)
    try {
      emit('add', 'Notes', 'Locked', 'P.md')
      await settleAll(() => !!getLiveTree()?.unreadable)
      expect(getLiveTree()?.unreadable).toEqual([{ path: 'Notes/Locked/P.md', reason: 'missing' }])
      expect(await readFile(abs('Notes', 'Locked', 'P.md'), 'utf8')).toBe('p\n')
    } finally {
      await chmod(abs('Notes', 'Locked'), 0o755)
    }
  })

  it('a page whose own event hasn’t settled is not stamped by another write’s walk', async () => {
    await startWatcher(root, win)
    await writeFile(abs('Notes', 'C.md'), 'still writing\n')
    await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
    emit('change', '.nexus', 'nexus.json')
    await settleAll(() => !!getLiveTree()?.unreadable)
    expect(getLiveTree()?.unreadable).toEqual([{ path: 'Notes/C.md', reason: 'missing' }])
    expect(await readFile(abs('Notes', 'C.md'), 'utf8')).toBe('still writing\n')
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

  it('an order list that moves nothing updates the held order and keeps the collections', async () => {
    await startWatcher(root, win)
    const before = getLiveTree()
    await writeFile(abs('.nexus', 'state.json'), JSON.stringify({ order: { collections: ['c1'] } }))
    emit('change', '.nexus', 'state.json')
    await settleAll()
    expect(pushMock.mock.calls.map((c) => c[1])).toEqual(['nav:changed', 'nexus:changed'])
    expect(getLiveTree()?.config.order.collections).toEqual(['c1'])
    expect(getLiveTree()?.collections).toBe(before?.collections)
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
    expect(getLiveTree()?.config.pageMetadata).toEqual({ [id]: { locked: true } })
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

describe('isConfigPath', () => {
  it('names each config file apart from the other', () => {
    expect(isConfigPath('/nexus', '/nexus/.nexus/state.json', 'state')).toBe(true)
    expect(isConfigPath('/nexus', '/nexus/.nexus/matrix.json', 'matrix')).toBe(true)
    expect(isConfigPath('/nexus', '/nexus/.nexus/matrix.json', 'state')).toBe(false)
    expect(isConfigPath('/nexus', '/nexus/.nexus/state.json', 'matrix')).toBe(false)
    expect(isConfigPath('/nexus', '/nexus/Notes/matrix.json', 'matrix')).toBe(false)
  })
})

describe('syncIgnoredUnder beside the classifier', () => {
  const scope = (assetDir: string) => ({ excluded: [], assetDir })
  const TILE_BODIES = ['.nexus/homepage/t1.md', '.nexus/contexts/Areas/Home/t1.md']

  it('reports a tile body, which tileBodyUnder then names', () => {
    const sync = syncIgnoredUnder('/nexus', scope('.nexus/assets'))
    for (const rel of TILE_BODIES) {
      expect(sync(`/nexus/${rel}`)).toBe(false)
      expect(tileBodyUnder(rel.split('/'), rel)).toBe(true)
    }
  })

  it('still refuses .trash', () => {
    expect(syncIgnoredUnder('/nexus', scope('.nexus/assets'))('/nexus/.trash/Notes/gone.md')).toBe(
      true,
    )
  })

  it('the asset root escapes the cruft rules; what sits below it does not', () => {
    // A root named `.attachments` is what the exemption exists for — a `.DS_Store` synced into one is not.
    expect(syncIgnoredUnder(root, scope('.attachments'))(abs('.attachments', 'x.png'))).toBe(false)
    expect(syncIgnoredUnder(root, scope('file-assets'))(abs('file-assets', 'x.png'))).toBe(false)
    for (const junk of ['.DS_Store', 'node_modules', '.git'])
      expect(syncIgnoredUnder(root, scope('file-assets'))(abs('file-assets', junk, 'x'))).toBe(true)
  })

  it('the homepage config under its host folder stays watched, though tile bodies do not', () => {
    expect(
      syncIgnoredUnder(root, scope('.nexus/assets'))(abs('.nexus', 'homepage', 'homepage.json')),
    ).toBe(false)
  })

  it('agrees with classifyEvent about what an asset path is', () => {
    const tree = getLiveTree()
    if (!tree) throw new Error('no tree')
    for (const dir of ['.nexus/assets', 'file-assets', '.attachments']) {
      const path = abs(...dir.split('/'), 'x.png')
      // A path the watcher drops but the classifier would have handled is silently lost.
      expect(syncIgnoredUnder(root, scope(dir))(path)).toBe(false)
      const scoped = { ...tree, config: { ...tree.config, assetDirectory: dir } }
      expect(classifyEvent(scoped, root, { event: 'change', absPath: path }).kind).toBe('asset')
    }
  })
})
