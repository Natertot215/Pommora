import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordWrite } from '../../Files/writeEcho'
import { emitWatch } from '../../Nexus/watchSettle'
import type { WatchScope } from '../../Paths/exclusion'
import { join } from '../../Paths/posix'
import { DEBOUNCE_MS, dirtyPending, installTap, reportRename, uninstallTap } from './tap'

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
