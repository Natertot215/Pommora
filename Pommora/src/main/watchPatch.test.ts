import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stabilize } from '@shared/treeStabilize'
import { dropLiveTree, getLiveTree, refreshTree } from './liveTree'
import { readNexus } from './readNexus'
import { applyWatchEvents, classifyEvent, type WatchEvent } from './watchPatch'

const ULID_A = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKACTAV9WEVGEMMVRZ'

let root: string

const abs = (...segs: string[]): string => join(root, ...segs)
const ev = (event: WatchEvent['event'], ...segs: string[]): WatchEvent => ({
  event,
  absPath: abs(...segs),
})

// A sidecar-mode nexus with one Collection (one page), one Context group with one Space, and
// one un-adopted folder holding a loose note — the live tree's whole vocabulary in miniature.
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-watch-'))
  await mkdir(abs('.nexus', 'contexts', 'Areas', 'Home'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await writeFile(
    abs('.nexus', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas' }] }),
  )
  await writeFile(
    abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
    JSON.stringify({ id: 'sp1' }),
  )
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(abs('Notes', 'A.md'), `---\nPageID: ${ULID_A}\n---\n\nalpha\n`)
  await mkdir(abs('Loose'), { recursive: true })
  await writeFile(abs('Loose', 'note.md'), 'links [[A]]\n')
})
afterEach(async () => {
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('applyWatchEvents — must agree with the walk', () => {
  it('a batch of external edits patches to exactly the tree a fresh walk produces', async () => {
    await refreshTree(root)
    await writeFile(
      abs('Notes', 'B.md'),
      `---\nPageID: ${ULID_B}\nicon: book\n(Areas):\n  - Home\n---\n\nbeta\n`,
    )
    await writeFile(abs('Notes', 'A.md'), `---\nPageID: ${ULID_A}\nicon: star\n---\n\nalpha\n`)
    await writeFile(abs('Loose', 'second.md'), 'more\n')
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', icon: 'folder', page_order: [ULID_B, ULID_A] }),
    )
    await writeFile(
      abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
      JSON.stringify({ id: 'sp1', color: 'mint' }),
    )
    await writeFile(
      abs('.nexus', 'settings.json'),
      JSON.stringify({ labels: { area: { singular: 'Realm', plural: 'Realms' } } }),
    )
    await writeFile(abs('.nexus', 'homepage.json'), JSON.stringify({ banner: 'Loose/b.png' }))

    const result = await applyWatchEvents(
      root,
      [
        ev('add', 'Notes', 'B.md'),
        ev('change', 'Notes', 'A.md'),
        ev('add', 'Loose', 'second.md'),
        ev('change', 'Notes', '_pagecollection.json'),
        ev('change', '.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
        ev('change', '.nexus', 'settings.json'),
        ev('change', '.nexus', 'homepage.json'),
      ],
      [],
    )
    expect(result).toBe('patched')

    const live = getLiveTree()
    expect(live).not.toBeNull()
    const notes = live?.collections[0]
    expect(notes?.icon).toBe('folder')
    expect(notes?.pages.map((p) => p.id)).toEqual([ULID_B, ULID_A])
    expect(notes?.pages[0]?.contextValues).toEqual({ ctx1: ['sp1'] })
    expect(live?.contexts[0]?.spaces[0]?.color).toBe('mint')
    expect(live?.labels.area.singular).toBe('Realm')
    expect(live?.homepage.banner).toBe('Loose/b.png')

    const walked = await readNexus(root)
    expect(stabilize(walked, live)).toBe(live)
  })

  it('a page deleted between event and read applies as a remove, walk-identically', async () => {
    await refreshTree(root)
    await unlink(abs('Notes', 'A.md'))
    const result = await applyWatchEvents(root, [ev('change', 'Notes', 'A.md')], [])
    expect(result).toBe('patched')
    const live = getLiveTree()
    expect(live?.collections[0]?.pages).toHaveLength(0)
    expect(stabilize(await readNexus(root), live)).toBe(live)
  })

  it('a file with Unknown admission never enters the tree — the walk owns that bookkeeping', async () => {
    await refreshTree(root)
    await writeFile(abs('Notes', 'bad.md'), `---\nTaskID: ${ULID_B}\n---\n\nnope\n`)
    const result = await applyWatchEvents(root, [ev('add', 'Notes', 'bad.md')], [])
    expect(result).toBe('refresh')
    expect(getLiveTree()?.collections[0]?.pages.map((p) => p.title)).toEqual(['A'])
  })

  it('an empty batch is a no-op that preserves tree identity', async () => {
    await refreshTree(root)
    const before = getLiveTree()
    expect(await applyWatchEvents(root, [], [])).toBe('patched')
    expect(getLiveTree()).toBe(before)
  })

  it('an exclusion change in settings is structural — refresh, never a leaf patch', async () => {
    await refreshTree(root)
    await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ excluded_folders: ['Loose'] }))
    expect(await applyWatchEvents(root, [ev('change', '.nexus', 'settings.json')], [])).toBe(
      'refresh',
    )
  })

  it('a mixed batch with one unclassifiable event refreshes once, patching nothing', async () => {
    await refreshTree(root)
    const before = getLiveTree()
    await writeFile(abs('Notes', 'B.md'), `---\nPageID: ${ULID_B}\n---\n\nbeta\n`)
    const result = await applyWatchEvents(
      root,
      [ev('add', 'Notes', 'B.md'), ev('change', '.nexus', 'contexts.json')],
      [],
    )
    expect(result).toBe('refresh')
    expect(getLiveTree()).toBe(before)
  })
})

describe('classifyEvent', () => {
  it('routes each path to its arm, with full-refresh as the total default', async () => {
    await refreshTree(root)
    const tree = getLiveTree()
    if (tree === null) throw new Error('no tree')
    const kind = (e: WatchEvent, excluded: string[] = []): string =>
      classifyEvent(tree, root, e, excluded).kind

    expect(kind(ev('add', 'Notes', 'B.md'))).toBe('page-upsert')
    expect(kind(ev('unlink', 'Notes', 'A.md'))).toBe('page-remove')
    expect(kind(ev('change', 'Notes', '_pagecollection.json'))).toBe('container-meta')
    expect(kind(ev('change', '.nexus', 'contexts', 'Areas', 'Home', '_space.json'))).toBe(
      'space-meta',
    )
    expect(kind(ev('change', '.nexus', 'settings.json'))).toBe('settings-leaf')
    expect(kind(ev('change', '.nexus', 'homepage.json'))).toBe('homepage-leaf')
    expect(kind(ev('add', 'Loose', 'second.md'))).toBe('index-only')
    expect(kind(ev('add', 'root-note.md'))).toBe('index-only')
    expect(kind(ev('change', 'Hidden', 'x.md'), ['Hidden'])).toBe('ignored')

    // Structural walk inputs and the residue classes land on the default arm.
    expect(kind(ev('change', '.nexus', 'contexts.json'))).toBe('full-refresh')
    expect(kind(ev('change', '.nexus', 'properties.json'))).toBe('full-refresh')
    expect(kind(ev('change', '.nexus', 'state.json'))).toBe('full-refresh')
    expect(kind(ev('addDir', 'Notes', 'Sub'))).toBe('full-refresh')
    expect(kind(ev('unlinkDir', 'Notes'))).toBe('full-refresh')
    expect(kind(ev('unlink', 'Notes', '_pagecollection.json'))).toBe('full-refresh')
    expect(kind(ev('add', 'Loose', '_pageset.json'))).toBe('full-refresh')
    expect(kind(ev('change', 'Notes', 'photo.png'))).toBe('full-refresh')
  })
})
