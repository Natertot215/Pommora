import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BrowserWindow } from 'electron'
import { dropLiveTree, getLiveTree, refreshTree } from './liveTree'
import { push } from './ipc'
import { sessionRoot } from './session'
import { startWatcher, stopWatcher } from './watcher'

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

const ULID_A = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKACTAV9WEVGEMMVRZ'
const ULID_C = '01CX5ZZKBKACTAV9WEVGEMMVRC'

let root: string
const abs = (...segs: string[]): string => join(root, ...segs)
const emit = (event: string, ...segs: string[]): void => handlers.get(event)?.(abs(...segs))
const settleAll = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(250)
  vi.useRealTimers()
  // The settle's async apply work runs on real time once the debounce fired.
  await new Promise((r) => setTimeout(r, 25))
  vi.useFakeTimers()
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-watchglue-'))
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(abs('Notes', 'A.md'), `---\nPageID: ${ULID_A}\n---\n\nalpha\n`)
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
    await writeFile(abs('Notes', 'B.md'), `---\nPageID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(abs('Notes', 'C.md'), `---\nPageID: ${ULID_C}\n---\n\ngamma\n`)
    emit('add', 'Notes', 'B.md')
    emit('add', 'Notes', 'C.md')
    await settleAll()
    expect(pushMock).toHaveBeenCalledTimes(1)
    const pushed = pushMock.mock.calls[0][2]
    expect(pushed).toBe(getLiveTree())
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
    await writeFile(abs('Notes', 'B.md'), `---\nPageID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(abs('.nexus', 'state.json'), JSON.stringify({ collection_order: ['c1'] }))
    emit('add', 'Notes', 'B.md')
    emit('change', '.nexus', 'state.json')
    await settleAll()
    expect(pushMock).toHaveBeenCalledTimes(1)
    const pushed = pushMock.mock.calls[0][2]
    expect(pushed).toBe(getLiveTree())
    expect(
      getLiveTree()
        ?.collections[0]?.pages.map((p) => p.title)
        .sort(),
    ).toEqual(['A', 'B'])
  })
})
