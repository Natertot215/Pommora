import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { blockHostKey } from '@shared/blocks'
import { isUlidShaped } from '@shared/identity'
import type { EntityRecord } from '@shared/record'
import { readKey, writeKey } from './Database/localState'
import { readPreviewsState, writePreviewsState } from './IO/previewState'
import { readBaseline, runOpenRecord } from './record'
import type { Baseline } from './record'
import { adjudicate } from './remint'
import { closeSessionDb, openSessionDb } from './sessionDb'

const claim = (path: string, over: Partial<EntityRecord> = {}): EntityRecord => ({
  id: 'page-dup',
  kind: 'page',
  title: path.split('/').pop() ?? path,
  path,
  state: 'present',
  ...over,
})

const priorAt = (path: string, over: Partial<Baseline[string]> = {}): Baseline => ({
  'page-dup': {
    id: 'page-dup',
    kind: 'page',
    title: 'Original',
    path,
    state: 'present',
    ...over,
  },
})

const dupes = (...claims: EntityRecord[]) => ({ 'page-dup': claims })

describe('adjudicate', () => {
  it('with no baseline, everything defers and nothing re-mints', () => {
    const out = adjudicate(dupes(claim('Library/A.md'), claim('Library/B.md')), null, [])
    expect(out.remint).toEqual([])
    expect(out.defer).toEqual(['page-dup'])
  })

  it('the claimant at the recorded path is the original; every other claimant re-mints', () => {
    const out = adjudicate(
      dupes(claim('Library/Original.md'), claim('Library/Copy.md')),
      priorAt('Library/Original.md'),
      [],
    )
    expect(out.defer).toEqual([])
    expect(out.remint).toEqual([{ id: 'page-dup', kind: 'page', path: 'Library/Copy.md' }])
  })

  it('three claimants: one original, two re-mints', () => {
    const out = adjudicate(
      dupes(claim('Library/Original.md'), claim('Library/Copy.md'), claim('Library/Copy 2.md')),
      priorAt('Library/Original.md'),
      [],
    )
    expect(out.remint.map((r) => r.path).sort()).toEqual(['Library/Copy 2.md', 'Library/Copy.md'])
  })

  it('an unreadable recorded path defers — never guess at the original', () => {
    const out = adjudicate(
      dupes(claim('Library/Original.md'), claim('Library/Copy.md')),
      priorAt('Library/Original.md'),
      ['Library/Original.md'],
    )
    expect(out.remint).toEqual([])
    expect(out.defer).toEqual(['page-dup'])
  })

  it('no claimant at the recorded path defers — the drop is the writer’s verb', () => {
    const out = adjudicate(
      dupes(claim('Library/A.md'), claim('Library/B.md')),
      priorAt('Elsewhere/Original.md'),
      [],
    )
    expect(out.remint).toEqual([])
    expect(out.defer).toEqual(['page-dup'])
  })

  it('a preserved ambiguous path is spent the session its claimant reads again', () => {
    const out = adjudicate(
      dupes(claim('Library/Original.md'), claim('Library/Copy.md')),
      priorAt('Library/Original.md', { ambiguous: true }),
      [],
    )
    expect(out.remint).toEqual([{ id: 'page-dup', kind: 'page', path: 'Library/Copy.md' }])
    expect(out.defer).toEqual([])
  })

  it('containers adjudicate exactly like content', () => {
    const set = (path: string): EntityRecord => ({
      id: 'set-dup',
      kind: 'set',
      title: 'Fiction',
      path,
      state: 'present',
    })
    const out = adjudicate(
      { 'set-dup': [set('Library/Fiction'), set('Library/Fiction copy')] },
      {
        'set-dup': {
          id: 'set-dup',
          kind: 'set',
          title: 'Fiction',
          path: 'Library/Fiction',
          state: 'present',
        },
      },
      [],
    )
    expect(out.remint).toEqual([{ id: 'set-dup', kind: 'set', path: 'Library/Fiction copy' }])
  })
})

describe('the re-mint writes', () => {
  const PAGE = '01KVGMT8BFG350FZZXAMG1QDSA'
  const SPACE = '01KVGMT8BFG350FZZXAMG1QDSB'
  const SET = '01KVGMT8BFG350FZZXAMG1QDSC'
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pom-remint-'))
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'nexus.json'),
      JSON.stringify({ id: 'nx-remint', createdAt: '2026' }),
    )
    await writeFile(
      join(root, '.nexus', 'contexts.json'),
      JSON.stringify({ contexts: [{ id: 'ctx_a', title: 'Areas', singular: 'Area' }] }),
    )
    await mkdir(join(root, '.nexus', 'contexts', 'Areas', 'Work'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'contexts', 'Areas', 'Work', '_space.json'),
      JSON.stringify({ id: SPACE, color: 'blue', keep_me: 'foreign' }),
    )
    await mkdir(join(root, 'Library', 'Fiction'), { recursive: true })
    await writeFile(
      join(root, 'Library', '_pagecollection.json'),
      JSON.stringify({ id: 'col-lib' }),
    )
    await writeFile(
      join(root, 'Library', 'Fiction', '_pageset.json'),
      JSON.stringify({
        id: SET,
        views: [
          { id: 'view-1', name: 'Table', type: 'table', property_order: [], hidden_properties: [] },
          { id: 'view-2', name: 'Board', type: 'table', property_order: [], hidden_properties: [] },
        ],
      }),
    )
    await writeFile(
      join(root, 'Library', 'Notes.md'),
      `---\nPageID: ${PAGE}\nkeep: foreign\n---\nthe body\n`,
    )
    openSessionDb(root)
  })

  afterEach(async () => {
    closeSessionDb()
    await rm(root, { recursive: true, force: true })
  })

  const SEEDED = [PAGE, SPACE, SET, 'col-lib', 'ctx_a']
  const freshIdsIn = (baseline: Record<string, unknown>): string[] =>
    Object.keys(baseline).filter((id) => !SEEDED.includes(id))

  it('a copied page re-mints: the copy takes a fresh id, the original never moves', async () => {
    await runOpenRecord(root)
    const originalBytes = await readFile(join(root, 'Library', 'Notes.md'), 'utf8')
    await writeFile(join(root, 'Library', 'Notes copy.md'), originalBytes)
    writeKey('folds', PAGE, ['intro'])
    writeKey('headingCols', PAGE, [0])
    writeKey('aliases', PAGE, ['the notes'])
    writeKey('headingIcon', PAGE, true)
    writePreviewsState({
      navSet: null,
      origins: { [PAGE]: { tabs: [{ target: { kind: 'page', id: PAGE } }], activeIndex: 0 } },
      open: null,
    })

    await runOpenRecord(root)

    expect(await readFile(join(root, 'Library', 'Notes.md'), 'utf8')).toBe(originalBytes)
    const copyBytes = await readFile(join(root, 'Library', 'Notes copy.md'), 'utf8')
    expect(copyBytes).not.toContain(PAGE)
    expect(copyBytes).toContain('keep: foreign')
    expect(copyBytes).toContain('the body')

    const baseline = readBaseline()!
    expect(baseline[PAGE].path).toBe('Library/Notes.md')
    const [fresh] = freshIdsIn(baseline)
    expect(isUlidShaped(fresh)).toBe(true)
    expect(baseline[fresh]).toMatchObject({ kind: 'page', path: 'Library/Notes copy.md' })

    expect(readKey('folds', PAGE)).toEqual(['intro'])
    expect(readKey('folds', fresh)).toEqual(['intro'])
    expect(readKey('headingCols', fresh)).toEqual([0])
    expect(readKey('aliases', fresh)).toEqual(['the notes'])
    expect(readKey('headingIcon', fresh)).toBe(true)
    const previews = readPreviewsState()
    expect(previews.origins[PAGE]).toBeDefined()
    expect(previews.origins[fresh]).toBeDefined()

    // The must-agree crossing: the re-minted file re-enters through a GENUINE walk — read off
    // disk, through admission, into the projection — not through the in-memory fix-up.
    await runOpenRecord(root)
    const rewalked = readBaseline()!
    expect(rewalked[fresh]).toMatchObject({
      kind: 'page',
      path: 'Library/Notes copy.md',
      state: 'present',
    })
    expect(rewalked[PAGE].path).toBe('Library/Notes.md')
  })

  it('a copied container re-mints its sidecar id AND its views[].id; the board never shares a config id', async () => {
    writeKey('activeView', SET, 'view-2')
    writeKey('viewOrder', 'view-2', ['page-b', 'page-a'])
    writeKey('blockDoc', blockHostKey({ kind: 'space', id: SPACE }), {
      blocks: [
        {
          id: 'tile-1',
          type: 'view',
          active: 0,
          views: [{ name: 'Board', config: { id: 'cfg-original', type: 'table' } }],
        },
      ],
    })
    await runOpenRecord(root)
    await cp(join(root, 'Library', 'Fiction'), join(root, 'Library', 'Fiction copy'), {
      recursive: true,
    })
    await cp(
      join(root, '.nexus', 'contexts', 'Areas', 'Work'),
      join(root, '.nexus', 'contexts', 'Areas', 'Work copy'),
      { recursive: true },
    )

    await runOpenRecord(root)

    const originalSet = JSON.parse(
      await readFile(join(root, 'Library', 'Fiction', '_pageset.json'), 'utf8'),
    )
    expect(originalSet.id).toBe(SET)
    expect(originalSet.views[0].id).toBe('view-1')
    const copySet = JSON.parse(
      await readFile(join(root, 'Library', 'Fiction copy', '_pageset.json'), 'utf8'),
    )
    expect(isUlidShaped(copySet.id)).toBe(true)
    expect(isUlidShaped(copySet.views[0].id)).toBe(true)
    expect(copySet.views[0].name).toBe('Table')

    const originalSpace = JSON.parse(
      await readFile(join(root, '.nexus', 'contexts', 'Areas', 'Work', '_space.json'), 'utf8'),
    )
    expect(originalSpace.id).toBe(SPACE)
    const copySpace = JSON.parse(
      await readFile(join(root, '.nexus', 'contexts', 'Areas', 'Work copy', '_space.json'), 'utf8'),
    )
    expect(isUlidShaped(copySpace.id)).toBe(true)
    expect(copySpace.keep_me).toBe('foreign')

    // The selection follows the view it names into the copy's own id namespace — asserting the
    // SECOND view is what makes this a proof of the map rather than a coincidence.
    expect(readKey('activeView', SET)).toBe('view-2')
    expect(readKey('activeView', copySet.id)).toBe(copySet.views[1].id)
    expect(readKey('activeView', copySet.id)).not.toBe('view-2')

    // The manual order keys ON the view, so it crosses under the copy's own view id — the
    // original's row is left exactly where it was.
    expect(readKey('viewOrder', 'view-2')).toEqual(['page-b', 'page-a'])
    expect(readKey('viewOrder', copySet.views[1].id)).toEqual(['page-b', 'page-a'])

    type Doc = { blocks: { views: { config: { id: string } }[] }[] }
    const originalDoc = readKey<Doc>('blockDoc', blockHostKey({ kind: 'space', id: SPACE }))!
    const copyDoc = readKey<Doc>('blockDoc', blockHostKey({ kind: 'space', id: copySpace.id }))!
    expect(originalDoc.blocks[0].views[0].config.id).toBe('cfg-original')
    expect(isUlidShaped(copyDoc.blocks[0].views[0].config.id)).toBe(true)
    expect(copyDoc.blocks[0].views[0].config.id).not.toBe(originalDoc.blocks[0].views[0].config.id)
  })

  it('a selection naming a view the container no longer has does not travel at all', async () => {
    // The copy must not inherit a reference it cannot resolve — copying it anyway is precisely
    // the dangling row this join exists to prevent.
    writeKey('activeView', SET, 'view-ghost')
    const bytes = await readFile(join(root, 'Library', 'Fiction', '_pageset.json'), 'utf8')
    await mkdir(join(root, 'Library', 'Fiction copy'), { recursive: true })
    await writeFile(join(root, 'Library', 'Fiction copy', '_pageset.json'), bytes)

    await runOpenRecord(root)
    await runOpenRecord(root)

    const copySet = JSON.parse(
      await readFile(join(root, 'Library', 'Fiction copy', '_pageset.json'), 'utf8'),
    )
    expect(copySet.id).not.toBe(SET)
    expect(readKey('activeView', SET)).toBe('view-ghost')
    expect(readKey('activeView', copySet.id)).toBeNull()
  })

  it('duplicates present at the very first open converge: record one, adjudicate next open', async () => {
    const bytes = await readFile(join(root, 'Library', 'Notes.md'), 'utf8')
    await writeFile(join(root, 'Library', 'Notes copy.md'), bytes)

    await runOpenRecord(root)
    // No prior evidence: nothing written, one claimant recorded unmarked.
    expect(await readFile(join(root, 'Library', 'Notes copy.md'), 'utf8')).toBe(bytes)
    const recorded = readBaseline()![PAGE]
    expect(recorded.ambiguous).toBeUndefined()

    await runOpenRecord(root)
    // The recorded path adjudicates: its claimant keeps the id, the other re-mints.
    const baseline = readBaseline()!
    expect(baseline[PAGE].path).toBe(recorded.path)
    const [fresh] = freshIdsIn(baseline)
    expect(isUlidShaped(fresh)).toBe(true)
  })
})

describe('the whole-Collection copy — the acceptance shape', () => {
  it('after two opens every copied id is fresh and every original keeps its own', async () => {
    const root2 = await mkdtemp(join(tmpdir(), 'pom-remint-col-'))
    try {
      await mkdir(join(root2, '.nexus'), { recursive: true })
      await writeFile(
        join(root2, '.nexus', 'nexus.json'),
        JSON.stringify({ id: 'nx-col', createdAt: '2026' }),
      )
      await mkdir(join(root2, 'Library', 'Fiction'), { recursive: true })
      await writeFile(
        join(root2, 'Library', '_pagecollection.json'),
        JSON.stringify({ id: '01KVGMT8BFG350FZZXAMG1QDWA' }),
      )
      await writeFile(
        join(root2, 'Library', 'Fiction', '_pageset.json'),
        JSON.stringify({ id: '01KVGMT8BFG350FZZXAMG1QDWB' }),
      )
      await writeFile(
        join(root2, 'Library', 'Notes.md'),
        '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDWC\n---\nbody',
      )
      closeSessionDb()
      openSessionDb(root2)

      await runOpenRecord(root2)
      await cp(join(root2, 'Library'), join(root2, 'Library copy'), { recursive: true })
      await runOpenRecord(root2)
      await runOpenRecord(root2)

      const original = {
        col: JSON.parse(await readFile(join(root2, 'Library', '_pagecollection.json'), 'utf8')),
        set: JSON.parse(await readFile(join(root2, 'Library', 'Fiction', '_pageset.json'), 'utf8')),
        page: await readFile(join(root2, 'Library', 'Notes.md'), 'utf8'),
      }
      expect(original.col.id).toBe('01KVGMT8BFG350FZZXAMG1QDWA')
      expect(original.set.id).toBe('01KVGMT8BFG350FZZXAMG1QDWB')
      expect(original.page).toContain('01KVGMT8BFG350FZZXAMG1QDWC')

      const copy = {
        col: JSON.parse(
          await readFile(join(root2, 'Library copy', '_pagecollection.json'), 'utf8'),
        ),
        set: JSON.parse(
          await readFile(join(root2, 'Library copy', 'Fiction', '_pageset.json'), 'utf8'),
        ),
        page: await readFile(join(root2, 'Library copy', 'Notes.md'), 'utf8'),
      }
      expect(isUlidShaped(copy.col.id)).toBe(true)
      expect(copy.col.id).not.toBe(original.col.id)
      expect(isUlidShaped(copy.set.id)).toBe(true)
      expect(copy.set.id).not.toBe(original.set.id)
      expect(copy.page).not.toContain('01KVGMT8BFG350FZZXAMG1QDWC')

      const baseline = readBaseline()!
      expect(baseline['01KVGMT8BFG350FZZXAMG1QDWA'].path).toBe('Library')
      expect(baseline[copy.col.id].path).toBe('Library copy')
    } finally {
      closeSessionDb()
      await rm(root2, { recursive: true, force: true })
    }
  })
})
