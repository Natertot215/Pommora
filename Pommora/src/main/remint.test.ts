import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { blockHostKey } from '@shared/blocks'
import { isUlidShaped } from '@shared/identity'
import type { EntityRecord } from '@shared/record'
import { readKey, writeKey } from './db/localState'
import { readPreviewsState, writePreviewsState } from './io/previewState'
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
    await writeFile(join(root, 'Library', '_pagecollection.json'), JSON.stringify({ id: 'col-lib' }))
    await writeFile(
      join(root, 'Library', 'Fiction', '_pageset.json'),
      JSON.stringify({
        id: SET,
        views: [{ id: 'view-1', name: 'Table', type: 'table', property_order: [], hidden_properties: [] }],
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
    writeKey('activeView', SET, 'view-1')
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

    expect(readKey('activeView', SET)).toBe('view-1')
    expect(readKey('activeView', copySet.id)).toBe('view-1')

    type Doc = { blocks: { views: { config: { id: string } }[] }[] }
    const originalDoc = readKey<Doc>('blockDoc', blockHostKey({ kind: 'space', id: SPACE }))!
    const copyDoc = readKey<Doc>('blockDoc', blockHostKey({ kind: 'space', id: copySpace.id }))!
    expect(originalDoc.blocks[0].views[0].config.id).toBe('cfg-original')
    expect(isUlidShaped(copyDoc.blocks[0].views[0].config.id)).toBe(true)
    expect(copyDoc.blocks[0].views[0].config.id).not.toBe(
      originalDoc.blocks[0].views[0].config.id,
    )
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
