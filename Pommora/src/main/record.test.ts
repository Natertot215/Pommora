import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { EntityRecord } from '@shared/record'
import type { CollectionNode, ContextGroup, NexusTree, PageNode, SetNode } from '@shared/types'
import { adoptedId } from './ids'
import {
  type Baseline,
  latchBaseline,
  projectBaseline,
  readBaseline,
  runOpenRecord,
  writeBaseline,
} from './record'
import { closeSessionDb, openSessionDb } from './sessionDb'

const page = (id: string, title: string, dir: string): PageNode => ({
  kind: 'page',
  id,
  title,
  path: `${dir}/${title}.md`,
})

const treeWith = (contexts: ContextGroup[], collections: CollectionNode[]): NexusTree =>
  ({ contexts, collections }) as NexusTree

const library = (pages: PageNode[], sets: SetNode[] = []): CollectionNode => ({
  kind: 'collection',
  id: '01COLZZKBKACTAV9WEVGEMMVRZ',
  title: 'Library',
  path: 'Library',
  sets,
  pages,
})

describe('projectBaseline', () => {
  // The trash's listing resolves every bundle against one tree, and every resolution opens with a
  // projection — so without this the walk runs once per row.
  it('projects one tree once, and a second tree separately', () => {
    const tree = treeWith([], [])
    expect(projectBaseline(tree)).toBe(projectBaseline(tree))
    expect(projectBaseline(treeWith([], []))).not.toBe(projectBaseline(tree))
  })

  it('projects contexts, spaces, collections, sets and pages with present state', () => {
    const contexts: ContextGroup[] = [
      {
        def: { id: 'ctx-areas', title: 'Areas' },
        spaces: [
          {
            kind: 'space',
            id: 'space-personal',
            title: 'Personal',
            path: '.nexus/contexts/Areas/Personal',
            contextId: 'ctx-areas',
          },
        ],
      },
    ]
    const sub: SetNode = {
      kind: 'set',
      id: 'set-fiction',
      title: 'Fiction',
      path: 'Library/Fiction',
      pages: [page('page-dune', 'Dune', 'Library/Fiction')],
    }
    const { entries, duplicates } = projectBaseline(
      treeWith(contexts, [library([page('page-notes', 'Notes', 'Library')], [sub])]),
    )
    expect(duplicates).toEqual({})
    expect(Object.keys(entries).sort()).toEqual([
      '01COLZZKBKACTAV9WEVGEMMVRZ',
      'ctx-areas',
      'page-dune',
      'page-notes',
      'set-fiction',
      'space-personal',
    ])
    expect(entries['ctx-areas']).toEqual({
      id: 'ctx-areas',
      kind: 'context',
      title: 'Areas',
      path: '.nexus/contexts/Areas',
      state: 'present',
    })
    expect(entries['set-fiction'].kind).toBe('set')
    expect(entries['page-dune'].path).toBe('Library/Fiction/Dune.md')
    for (const e of Object.values(entries)) expect(e.state).toBe('present')
  })

  it('filters adopted ids — an un-adopted folder never enters the baseline', () => {
    const unadopted: SetNode = {
      kind: 'set',
      id: adoptedId('Library/Scans'),
      title: 'Scans',
      path: 'Library/Scans',
      pages: [],
    }
    const { entries } = projectBaseline(treeWith([], [library([], [unadopted])]))
    expect(Object.keys(entries)).toEqual(['01COLZZKBKACTAV9WEVGEMMVRZ'])
  })

  it('collects every claimant of a duplicated id in walk order, first into entries', () => {
    const original = page('page-dup', 'Original', 'Library')
    const copy = page('page-dup', 'Original copy', 'Library')
    const { entries, duplicates } = projectBaseline(treeWith([], [library([original, copy])]))
    expect(entries['page-dup'].title).toBe('Original')
    expect(duplicates['page-dup'].map((c) => c.title)).toEqual(['Original', 'Original copy'])
  })
})

describe('latchBaseline', () => {
  const projected = (...pages: PageNode[]) => projectBaseline(treeWith([], [library([...pages])]))

  it('passes entries through untouched with no prior and nothing unreadable', () => {
    const latched = latchBaseline(projected(page('page-a', 'A', 'Library')), [], null)
    expect(latched['page-a']).toEqual({
      id: 'page-a',
      kind: 'page',
      title: 'A',
      path: 'Library/A.md',
      state: 'present',
    })
  })

  it('a walked path that is also listed unreadable records unreadable — the listing wins', () => {
    const latched = latchBaseline(projected(page('page-a', 'A', 'Library')), ['Library/A.md'], null)
    expect(latched['page-a'].state).toBe('unreadable')
  })

  it('an id the walk lost whose recorded home is unreadable carries through, never deleted', () => {
    const prior: Baseline = {
      'page-gone': {
        id: 'page-gone',
        kind: 'page',
        title: 'Gone',
        path: 'Library/Gone.md',
        state: 'present',
      },
    }
    const latched = latchBaseline(projected(), ['Library/Gone.md'], prior)
    expect(latched['page-gone']).toEqual({ ...prior['page-gone'], state: 'unreadable' })
  })

  it('an id the walk lost with a readable home leaves the baseline — a real deletion', () => {
    const prior: Baseline = {
      'page-gone': {
        id: 'page-gone',
        kind: 'page',
        title: 'Gone',
        path: 'Library/Gone.md',
        state: 'present',
      },
    }
    expect(latchBaseline(projected(), [], prior)['page-gone']).toBeUndefined()
  })

  it('a duplicated id keeps the prior entry marked ambiguous when its path still claims', () => {
    const prior: Baseline = {
      'page-dup': {
        id: 'page-dup',
        kind: 'page',
        title: 'Original',
        path: 'Library/Original.md',
        state: 'present',
      },
    }
    const latched = latchBaseline(
      projected(page('page-dup', 'Original', 'Library'), page('page-dup', 'Copy', 'Library')),
      [],
      prior,
    )
    expect(latched['page-dup']).toEqual({ ...prior['page-dup'], ambiguous: true })
  })

  it('a duplicated id whose recorded path is gone drops — no session can adjudicate it', () => {
    const prior: Baseline = {
      'page-dup': {
        id: 'page-dup',
        kind: 'page',
        title: 'Original',
        path: 'Elsewhere/Original.md',
        state: 'present',
      },
    }
    const latched = latchBaseline(
      projected(page('page-dup', 'A', 'Library'), page('page-dup', 'B', 'Library')),
      [],
      prior,
    )
    expect(latched['page-dup']).toBeUndefined()
  })

  it('a duplicated id with no prior entry records the first claimant unmarked', () => {
    const latched = latchBaseline(
      projected(page('page-dup', 'A', 'Library'), page('page-dup', 'B', 'Library')),
      [],
      null,
    )
    expect(latched['page-dup']).toEqual({
      id: 'page-dup',
      kind: 'page',
      title: 'A',
      path: 'Library/A.md',
      state: 'present',
    })
  })

  it('an unusable registry carries every prior context and space as unreadable', () => {
    const prior: Baseline = {
      'ctx-areas': {
        id: 'ctx-areas',
        kind: 'context',
        title: 'Areas',
        path: '.nexus/contexts/Areas',
        state: 'present',
      },
      'space-personal': {
        id: 'space-personal',
        kind: 'space',
        title: 'Personal',
        path: '.nexus/contexts/Areas/Personal',
        state: 'present',
      },
      'page-gone': {
        id: 'page-gone',
        kind: 'page',
        title: 'Gone',
        path: 'Library/Gone.md',
        state: 'present',
      },
    }
    const latched = latchBaseline(projected(), ['.nexus/contexts.json'], prior)
    expect(latched['ctx-areas']).toEqual({ ...prior['ctx-areas'], state: 'unreadable' })
    expect(latched['space-personal']).toEqual({ ...prior['space-personal'], state: 'unreadable' })
    expect(latched['page-gone']).toBeUndefined()
  })

  it('a duplicated id whose recorded path is unreadable defers, never guesses', () => {
    const prior: Baseline = {
      'page-dup': {
        id: 'page-dup',
        kind: 'page',
        title: 'Original',
        path: 'Library/Original.md',
        state: 'present',
      },
    }
    const latched = latchBaseline(
      projected(page('page-dup', 'A', 'Library'), page('page-dup', 'B', 'Library')),
      ['Library/Original.md'],
      prior,
    )
    expect(latched['page-dup']).toEqual({
      ...prior['page-dup'],
      state: 'unreadable',
      ambiguous: true,
    })
  })
})

describe('the record rows', () => {
  let root: string
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pom-record-'))
    openSessionDb(root)
  })
  afterEach(async () => {
    closeSessionDb()
    await rm(root, { recursive: true, force: true })
  })

  const entry: EntityRecord = {
    id: 'page-a',
    kind: 'page',
    title: 'A',
    path: 'Library/A.md',
    state: 'present',
  }

  it('reads null before any baseline is written — absence is not an empty map', () => {
    expect(readBaseline()).toBeNull()
  })

  it('round-trips the baseline, ambiguous markers included', () => {
    const b: Baseline = { 'page-a': { ...entry, ambiguous: true } }
    expect(writeBaseline(b)).toBe(true)
    expect(readBaseline()).toEqual(b)
  })

  it('an empty baseline round-trips as empty, distinct from absent', () => {
    expect(writeBaseline({})).toBe(true)
    expect(readBaseline()).toEqual({})
  })

  it('with no database open, reads are null and writes report failure', () => {
    closeSessionDb()
    expect(readBaseline()).toBeNull()
    expect(writeBaseline({})).toBe(false)
  })
})

describe('runOpenRecord — the open sequence', () => {
  const NOTES = '01KVGMT8BFG350FZZXAMG1QDRW'
  let root: string
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pom-open-'))
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'nexus.json'),
      JSON.stringify({ id: 'nx-open', createdAt: '2026' }),
    )
    await mkdir(join(root, 'Library'))
    await writeFile(
      join(root, 'Library', '_pagecollection.json'),
      JSON.stringify({ id: 'col-lib' }),
    )
    await writeFile(join(root, 'Library', 'Notes.md'), `---\nPageID: ${NOTES}\n---\nbody`)
    openSessionDb(root)
  })
  afterEach(async () => {
    closeSessionDb()
    await rm(root, { recursive: true, force: true })
  })

  it('latches silently, and a closed-window rename follows the id to its new path', async () => {
    await runOpenRecord(root)
    expect(readBaseline()?.[NOTES]?.path).toBe('Library/Notes.md')

    await rename(join(root, 'Library', 'Notes.md'), join(root, 'Library', 'Journal.md'))
    await runOpenRecord(root)
    expect(readBaseline()?.[NOTES]?.path).toBe('Library/Journal.md')

    // An uneventful open re-latches the same answer rather than drifting off it.
    await runOpenRecord(root)
    expect(readBaseline()?.[NOTES]?.path).toBe('Library/Journal.md')
  })

  it('a failed walk retains the prior baseline and the open proceeds', async () => {
    await runOpenRecord(root)
    const first = readBaseline()
    await expect(runOpenRecord(join(root, 'no-such-root'))).resolves.toBeUndefined()
    expect(readBaseline()).toEqual(first)
  })

  it('a nexus with zero entities latches an empty baseline — written, not skipped', async () => {
    await rm(join(root, 'Library'), { recursive: true, force: true })
    await runOpenRecord(root)
    expect(readBaseline()).toEqual({})
  })

  it('with no prior evidence the eldest claimant records — the original never re-mints', async () => {
    const body = `---\nPageID: ${NOTES}\n---\nbody`
    await runOpenRecord(root)
    // Closed window: the original renamed (birth time survives) AND copied. The copy's name
    // sorts first, so a walk-order pick would crown it and re-mint the original.
    await rename(join(root, 'Library', 'Notes.md'), join(root, 'Library', 'Zed.md'))
    await new Promise((r) => setTimeout(r, 20))
    await writeFile(join(root, 'Library', 'Aaa.md'), body)

    await runOpenRecord(root) // the recorded path is gone: the entry drops
    await runOpenRecord(root) // no prior: the eldest claimant records unmarked
    expect(readBaseline()?.[NOTES]?.path).toBe('Library/Zed.md')

    await runOpenRecord(root) // adjudication: the copy re-mints, the original keeps its id
    expect(await readFile(join(root, 'Library', 'Zed.md'), 'utf8')).toContain(NOTES)
    expect(await readFile(join(root, 'Library', 'Aaa.md'), 'utf8')).not.toContain(NOTES)
    expect(readBaseline()?.[NOTES]?.path).toBe('Library/Zed.md')
  })

  it('a dropped duplicate leaves the baseline without being recorded as a removal', async () => {
    await runOpenRecord(root)
    const body = `---\nPageID: ${NOTES}\n---\nbody`
    await rename(join(root, 'Library', 'Notes.md'), join(root, 'Library', 'A.md'))
    await writeFile(join(root, 'Library', 'B.md'), body)
    await runOpenRecord(root)
    // Two claimants, neither at the recorded path: the entry drops from the baseline, because
    // two copies on disk are not a deletion and the id is in flux until one is adjudicated.
    expect(readBaseline()?.[NOTES]).toBeUndefined()
  })

  it('a sidecar corrupted while closed reads as an unreadable transition, never a removal', async () => {
    await runOpenRecord(root)
    await writeFile(join(root, 'Library', '_pagecollection.json'), '{corrupt')
    await runOpenRecord(root)
    const baseline = readBaseline()
    expect(baseline?.['col-lib']).toEqual({
      id: 'col-lib',
      kind: 'collection',
      title: 'Library',
      path: 'Library',
      state: 'unreadable',
    })
  })
})
