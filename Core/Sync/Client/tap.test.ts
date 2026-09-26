import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { updateNexusFile } from '../../Files/atomicWrite'
import { recordWrite } from '../../Files/writeEcho'
import { installStores, NO_STORES } from '../../Platform/stores'
import { tempRoot } from '../../Testing/hostFs'
import { memoryStores } from '../../Testing/memoryStores'
import { upsertBase } from './base'
import { emitWatch } from '../../Nexus/watchSettle'
import type { WatchScope } from '../../Paths/exclusion'
import { join } from '../../Paths/posix'
import {
  DEBOUNCE_MS,
  dirtyPending,
  installTap,
  reportRename,
  setTapScope,
  uninstallTap,
} from './tap'

const ROOT = '/nexus'
const SCOPE: WatchScope = { excluded: [], assetDir: '.nexus/assets' }

let dirty: string[][]
let renames: Array<[string, string]>

const arm = (): void => {
  installTap(ROOT, SCOPE, {
    onDirty: (rels) => dirty.push(rels),
    onRename: (from, to) => renames.push([from, to]),
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  dirty = []
  renames = []
  arm()
})

afterEach(() => {
  uninstallTap()
  vi.useRealTimers()
})

describe('installTap', () => {
  it('batches two events on one path into one onDirty', async () => {
    emitWatch('change', join(ROOT, 'Notes/One.md'))
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 500)
    emitWatch('change', join(ROOT, 'Notes/One.md'))
    emitWatch('change', join(ROOT, 'Notes/Two.md'))
    expect(dirty).toEqual([])
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1)
    expect(dirty).toEqual([['Notes/One.md', 'Notes/Two.md']])
  })

  it('never reports a thumbnail', async () => {
    emitWatch('add', join(ROOT, '.nexus/assets/01/thumbnails/cover.png'))
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1)
    expect(dirty).toEqual([])
  })

  it('reports a .trash write from the write tap', async () => {
    emitWatch('unlink', join(ROOT, '.trash/Bundle/One.md'))
    recordWrite(join(ROOT, '.trash/Bundle/One.md'))
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1)
    expect(dirty).toEqual([['.trash/Bundle/One.md']])
  })

  it('clears pending timers on a rename report and reaches onRename', async () => {
    emitWatch('change', join(ROOT, 'Notes/One.md'))
    expect(dirtyPending()).toEqual(new Set(['Notes/One.md']))
    reportRename('Notes/One.md', 'Notes/Two.md')
    expect(renames).toEqual([['Notes/One.md', 'Notes/Two.md']])
    expect(dirtyPending()).toEqual(new Set())
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1)
    expect(dirty).toEqual([])
  })

  it('admits against the scope it is handed last, both taps at once', async () => {
    setTapScope({ excluded: ['Notes'], assetDir: '.nexus/assets' })
    emitWatch('change', join(ROOT, 'Notes/One.md'))
    recordWrite(join(ROOT, 'Notes/Two.md'))
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1)
    expect(dirty).toEqual([])

    setTapScope(SCOPE)
    emitWatch('change', join(ROOT, 'Notes/One.md'))
    recordWrite(join(ROOT, 'Notes/Two.md'))
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1)
    expect(dirty).toEqual([['Notes/One.md', 'Notes/Two.md']])
  })

  it('cancels every timer on uninstall', async () => {
    emitWatch('change', join(ROOT, 'Notes/One.md'))
    recordWrite(join(ROOT, 'Notes/Two.md'))
    uninstallTap()
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1)
    expect(dirty).toEqual([])
    expect(dirtyPending()).toEqual(new Set())
    emitWatch('change', join(ROOT, 'Notes/One.md'))
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1)
    expect(dirty).toEqual([])
  })
})

describe('the repair seed', () => {
  it('rebuilds a file damaged before any read from its last synced copy, and not once uninstalled', async () => {
    vi.useRealTimers()
    const root = tempRoot('pom-tap-')
    installStores(memoryStores().stores)
    const synced = new TextEncoder().encode(JSON.stringify({ order: { collections: ['a'] } }))
    for (const path of ['state.json', 'matrix.json'])
      upsertBase({
        path,
        mtimeMs: 0,
        size: 0,
        hash: 'h',
        blobSha: 'b',
        version: 1,
        baseBytes: synced,
      })
    const repair = async (name: string): Promise<unknown> => {
      const file = join(root, name)
      await writeFile(file, '{ corrupt')
      await updateNexusFile(file, (cur) => ({ ...cur, pinned: ['p'] }), true)
      return JSON.parse(await readFile(file, 'utf8'))
    }
    try {
      installTap(root, SCOPE, { onDirty: () => {}, onRename: () => {} })
      expect(await repair('state.json')).toEqual({ order: { collections: ['a'] }, pinned: ['p'] })
      uninstallTap()
      expect(await repair('matrix.json')).toEqual({ pinned: ['p'] })
    } finally {
      installStores(NO_STORES)
      await rm(root, { recursive: true, force: true })
    }
  })
})
