import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { readJsonAt, tempRoot } from '../Testing/hostFs'
import { STASHED_AT } from '../Testing/definitions'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { dropLiveTree, patchLiveTree, seedLiveTree } from '../Nexus/liveTree'
import { readNexus } from '../Nexus/readNexus'
import { sidecarPath } from '../Paths/paths'
import { patchStashBlock, stashedBlock, sweepStashes } from './propertyStash'

describe('the stash block', () => {
  it('reads a stamped block, and none without a stamp', () => {
    const sidecar = {
      id: 'c',
      property_stash: {
        p: { removed_at: STASHED_AT, values: { a: 1 } },
        q: { values: { b: 2 } },
        r: { removed_at: STASHED_AT, values: 'x' },
      },
    }
    expect(stashedBlock(sidecar, 'p')).toEqual({ removed_at: STASHED_AT, values: { a: 1 } })
    expect(stashedBlock(sidecar, 'q')).toBeNull()
    expect(stashedBlock(sidecar, 'r')).toBeNull()
    expect(stashedBlock(sidecar, 'absent')).toBeNull()
  })

  it("writes the block it's given, and a block with no values, or none, leaves no key", () => {
    const block = { removed_at: '2026-10-20T00:00:00.000Z', values: { a: 2 } }
    expect(patchStashBlock({ id: 'c' }, 'p', block)).toEqual({
      id: 'c',
      property_stash: { p: block },
    })
    const held = { id: 'c', property_stash: { p: { removed_at: STASHED_AT, values: { a: 1 } } } }
    expect(patchStashBlock(held, 'p', { removed_at: STASHED_AT, values: {} })).toEqual({ id: 'c' })
    expect(patchStashBlock(held, 'p')).toEqual({ id: 'c' })
  })

  it('an `above` leaves with its value', () => {
    const written = patchStashBlock({ id: 'c' }, 'p', {
      removed_at: STASHED_AT,
      values: { a: 1 },
      above: { a: 'Zed', b: 'Note' },
    })
    expect(JSON.parse(JSON.stringify(written)).property_stash.p).toEqual({
      removed_at: STASHED_AT,
      values: { a: 1 },
      above: { a: 'Zed' },
    })
    const placeless = patchStashBlock({ id: 'c' }, 'p', {
      removed_at: STASHED_AT,
      values: { a: 1 },
      above: { b: 'Note' },
    })
    expect(JSON.parse(JSON.stringify(placeless)).property_stash.p).not.toHaveProperty('above')
  })
})

describe('sweepStashes', () => {
  let root: string
  let notes: string
  let tasks: string
  const stamped = (removed_at: string) => ({ removed_at, values: { a: 1 } })
  const seed = async (folder: string, stash: Record<string, unknown>): Promise<void> => {
    const file = sidecarPath(folder, 'collection')
    await writeFile(file, JSON.stringify({ ...(await readJsonAt(file)), property_stash: stash }))
  }

  beforeEach(async () => {
    vi.setSystemTime(new Date('2026-10-22T09:00:00.000Z'))
    root = tempRoot('pom-stash-sweep-')
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ personalization: { historyDays: 7 } }),
    )
    const n = await createFolderEntity(root, 'collection', 'Notes', newId())
    const t = await createFolderEntity(root, 'collection', 'Tasks', newId())
    if (!n.ok || !t.ok) throw new Error('setup failed')
    notes = n.value.path
    tasks = t.value.path
    await seed(notes, {
      p: stamped('2026-10-14T08:00:00.000Z'),
      q: stamped('2026-10-16T09:00:00.000Z'),
    })
    await seed(tasks, { p: stamped('2026-10-01T08:00:00.000Z') })
    seedLiveTree(await readNexus(root))
  })
  afterEach(async () => {
    vi.useRealTimers()
    dropLiveTree()
    await rm(root, { recursive: true, force: true })
  })

  it('drops a block removed before the History Timeframe and keeps one inside it', async () => {
    await sweepStashes(root)
    expect((await readJsonAt(sidecarPath(notes, 'collection'))).property_stash).toEqual({
      q: stamped('2026-10-16T09:00:00.000Z'),
    })
  })

  it('opens no sidecar the tree doesn’t list as stashing', async () => {
    const file = sidecarPath(tasks, 'collection')
    const before = [await readFile(file, 'utf8'), (await stat(file)).mtimeMs]
    patchLiveTree((tree) => ({
      ...tree,
      collections: tree.collections.map((c) =>
        c.path === 'Tasks' ? { ...c, stashed: undefined } : c,
      ),
    }))
    await sweepStashes(root)
    expect([await readFile(file, 'utf8'), (await stat(file)).mtimeMs]).toEqual(before)
  })

  it('reads nothing with no tree held', async () => {
    dropLiveTree()
    await sweepStashes(root)
    expect((await readJsonAt(sidecarPath(tasks, 'collection'))).property_stash).toEqual({
      p: stamped('2026-10-01T08:00:00.000Z'),
    })
  })
})
