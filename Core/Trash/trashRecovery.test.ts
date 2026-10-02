// Every restoration combination the surface can produce, driven through the same ops the leaf calls, against a real nexus on disk.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { pathExists } from '../Files/atomicWrite'
import { settledMutate } from '../Testing/settledMutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { listBundles } from './holdings'
import { readRecord } from './record'
import { trashRows } from './trashRows'
import { readNexus } from '../Nexus/readNexus'
import { closeSession, openSession } from '../Nexus/session'
import { splitFrontmatter } from '../Files/pageFile'
import { deleteProperty } from '../Properties/deleteProperty'
import { removeProperty } from '../Properties/removeProperty'
import { assignProperty } from '../Properties/assignment'
import { newContentId, newId } from '../Nexus/ids'
import { handleMutate } from '../Nexus/mutate'
import { settleNow } from '../Nexus/settle'
import type { ValueChange } from '../Nexus/tree'
import type { Pushes } from '../Contract/bridge'
import { renameProperty } from '../Properties/registryProperty'
import type { TrashDeps } from './bundle'

let root: string
const handed: string[] = []
const deps: TrashDeps = {
  trashMode: 'nexus',
  trashToSystem: async (p) => void handed.push(p),
}
const rows = async () => trashRows(await listBundles(root), await readNexus(root))
const find = async (title: string) => {
  const hit = (await rows()).find((r) => r.title === title)
  expect(hit, `no row titled ${title}`).toBeDefined()
  return hit as NonNullable<typeof hit>
}
const del = async (path: string, kind: string) => {
  await refreshTree(root)
  const r = await settledMutate(root, { op: 'delete', path, kind } as never, deps)
  expect(r.ok, `delete ${path}`).toBe(true)
}
const beta = join('Journal', 'Daily', 'Beta.md')
const BETA_ID = '01KVGMT8BFP350FZZXAMG1QDVC'
const linker = (rel: string, id: string, keys: string) =>
  writeFile(join(root, rel), `---\nID: ${id}\n${keys}\n---\nlinker\n`)
const frontmatter = async (rel = beta) => splitFrontmatter(await readFile(join(root, rel), 'utf8'))

beforeEach(async () => {
  handed.length = 0
  root = tempRoot('pom-e2e-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(contextsDir(root), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({
      contexts: [
        { id: 'ctx_areas', title: 'Areas' },
        { id: 'ctx_projects', title: 'Projects' },
      ],
    }),
  )
  await writeFile(
    join(root, '.nexus', 'properties.json'),
    JSON.stringify({
      order: ['prop_status', 'prop_related', 'prop_parent'],
      defs: {
        prop_status: {
          id: 'prop_status',
          name: 'Status',
          type: 'select',
          select_options: [{ value: 'live', color: 'green' }],
        },
        prop_related: { id: 'prop_related', name: 'Related', type: 'link' },
        prop_parent: { id: 'prop_parent', name: 'Parent', type: 'link' },
      },
    }),
  )
  for (const [ctx, space, id] of [
    ['Projects', 'Pommora', 'sp-pom'],
    ['Areas', 'Health', 'sp-health'],
  ]) {
    await mkdir(join(contextsDir(root), ctx, space), { recursive: true })
    await writeFile(join(contextsDir(root), ctx, space, '_space.json'), JSON.stringify({ id }))
  }
  await mkdir(join(root, 'Journal', 'Daily'), { recursive: true })
  await writeFile(
    join(root, 'Journal', '_pagecollection.json'),
    JSON.stringify({
      id: 'col-journal',
      properties: ['prop_status', 'prop_related', 'prop_parent'],
    }),
  )
  await writeFile(
    join(root, 'Journal', 'Daily', '_pageset.json'),
    JSON.stringify({ id: 'set-daily' }),
  )
  await writeFile(
    join(root, 'Journal', 'Daily', 'Alpha.md'),
    '---\nID: 01KVGMT8BFP350FZZXAMG1QDVA\nStatus: live\n---\nbody\n',
  )
  await linker(beta, BETA_ID, 'Related: "[[Alpha]]"')
  await mkdir(join(root, 'Plain'), { recursive: true })
  await writeFile(join(root, 'Plain', '_pagecollection.json'), JSON.stringify({ id: 'col-plain' }))
  await openSession(root)
})

afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('end to end — deleted, listed, restored', () => {
  it('a page deleted and restored comes back where it was, and leaves the list', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    const row = await find('Alpha')
    expect(row.homeResolves).toBe(true)
    expect(row.crumbs.map((c) => c.title)).toEqual(['Journal', 'Daily'])
    const r = await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath }, deps)
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Journal', 'Daily', 'Alpha.md'))).toBe(true)
    expect(await rows()).toHaveLength(0)
  })

  it('a renamed parent is followed — the row reads the new name and the file lands in it', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    expect(
      (
        await settledMutate(
          root,
          { op: 'rename', path: 'Journal', kind: 'collection', newName: 'Logbook' },
          deps,
        )
      ).ok,
    ).toBe(true)
    const row = await find('Alpha')
    expect(row.crumbs.map((c) => c.title)).toEqual(['Logbook', 'Daily'])
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath }, deps)).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Logbook', 'Daily', 'Alpha.md'))).toBe(true)
  })

  it('a Space restores into a RENAMED Context, and its breadcrumb said so first', async () => {
    await del('.nexus/contexts/Projects/Pommora', 'space')
    expect(
      (
        await settledMutate(
          root,
          { op: 'renameContext', contextId: 'ctx_projects', newName: 'Ventures' },
          deps,
        )
      ).ok,
    ).toBe(true)
    const row = await find('Pommora')
    expect(row.crumbs).toEqual([{ kind: 'context', title: 'Ventures' }])
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath }, deps)).ok,
    ).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora', '_space.json'))).toBe(
      true,
    )
  })

  it('every restoration case: each homeless kind lands where it is told', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    let row = await find('Alpha')
    expect(
      (
        await settledMutate(
          root,
          {
            op: 'restore',
            bundlePath: row.bundlePath,
            destination: { kind: 'container', id: 'set-daily' },
          },
          deps,
        )
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Journal', 'Daily', 'Alpha.md'))).toBe(true)

    // page → Collection, with its Set gone: the plain restore refuses first, nothing climbs
    await del('Journal/Daily/Alpha.md', 'page')
    await del('Journal/Daily', 'set')
    row = await find('Alpha')
    expect(row.homeResolves).toBe(false)
    expect(row.historical).toBe(true)
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath }, deps)).ok,
    ).toBe(false)
    expect(
      (
        await settledMutate(
          root,
          {
            op: 'restore',
            bundlePath: row.bundlePath,
            destination: { kind: 'container', id: 'col-journal' },
          },
          deps,
        )
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Journal', 'Alpha.md'))).toBe(true)

    const setRow = await find('Daily')
    expect(
      (
        await settledMutate(
          root,
          {
            op: 'restore',
            bundlePath: setRow.bundlePath,
            destination: { kind: 'container', id: 'col-journal' },
          },
          deps,
        )
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Journal', 'Daily', '_pageset.json'))).toBe(true)

    await del('.nexus/contexts/Projects/Pommora', 'space')
    await del('.nexus/contexts/Projects', 'context')
    const spaceRow = await find('Pommora')
    expect(spaceRow.homeResolves).toBe(false)
    expect(
      (
        await settledMutate(
          root,
          {
            op: 'restore',
            bundlePath: spaceRow.bundlePath,
            destination: { kind: 'context', id: 'ctx_areas' },
          },
          deps,
        )
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Areas', 'Pommora', '_space.json'))).toBe(true)
  })

  it('a relocation keeps the page whole — its values ride along as frontmatter', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    await del('Journal/Daily', 'set')
    const row = await find('Alpha')
    expect(
      (
        await settledMutate(
          root,
          {
            op: 'restore',
            bundlePath: row.bundlePath,
            destination: { kind: 'container', id: 'col-plain' },
          },
          deps,
        )
      ).ok,
    ).toBe(true)
    const landed = await readFile(join(root, 'Plain', 'Alpha.md'), 'utf8')
    expect(landed.includes('Status')).toBe(true)
    expect(landed.includes('ID:')).toBe(true)
    expect(landed.includes('body')).toBe(true)
  })

  it('a mixed batch restores what it can and names what it cannot', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    await del('Journal/Daily', 'set')
    await del('.nexus/contexts/Areas/Health', 'space')
    const all = await rows()
    const addressable = all.filter((r) => r.homeResolves)
    const homeless = all.filter((r) => !r.homeResolves)
    expect(addressable.map((r) => r.title).sort()).toEqual(['Daily', 'Health'])
    expect(homeless.map((r) => r.title)).toEqual(['Alpha'])
    for (const r of addressable)
      expect(
        (await settledMutate(root, { op: 'restore', bundlePath: r.bundlePath }, deps)).ok,
      ).toBe(true)
    expect((await rows()).map((r) => r.title)).toEqual(['Alpha'])
  })

  it('emptying hands the artifact over, and the switch decides whether it goes at all', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    let row = await find('Alpha')
    expect(
      (await settledMutate(root, { op: 'emptyBundle', bundlePath: row.bundlePath }, deps)).ok,
    ).toBe(true)
    expect(handed).toHaveLength(1)
    expect(handed[0].endsWith('Alpha.md')).toBe(true)
    expect(await rows()).toHaveLength(0)

    await writeFile(
      join(root, 'Journal', 'Beta.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVB\n---\nb\n',
    )
    await del('Journal/Beta.md', 'page')
    row = await find('Beta')
    const permanent: TrashDeps = { ...deps, permanentDelete: true }
    expect(
      (await settledMutate(root, { op: 'emptyBundle', bundlePath: row.bundlePath }, permanent)).ok,
    ).toBe(true)
    expect(handed).toHaveLength(1)
    expect(await rows()).toHaveLength(0)
  })
})

describe('links come back with the page', () => {
  const restore = async (title: string) => {
    const { bundlePath } = await find(title)
    const r = await settledMutate(root, { op: 'restore', bundlePath }, deps)
    expect(r.ok, `restore ${title}`).toBe(true)
    return r.ok ? r.value.unrestored : undefined
  }
  const relink = (propertyId: string) =>
    settledMutate(
      root,
      { op: 'setProperty', path: beta, propertyId, value: { kind: 'link', value: '[[Other]]' } },
      deps,
    )

  it('a restored page writes its Link values back onto the pages they came from', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    expect((await frontmatter()).Related).toBeUndefined()
    expect((await listBundles(root))[0].record).toMatchObject({
      links: [{ page: BETA_ID, property: 'prop_related', value: '[[Alpha]]' }],
    })
    expect(await restore('Alpha')).toBeUndefined()
    expect(await frontmatter()).toMatchObject({ Related: '[[Alpha]]' })
    expect(await frontmatter()).not.toHaveProperty('Parent')
    expect(await rows()).toHaveLength(0)
  })

  it.each([
    ['[[Alpha]]', '[[Alpha (2)]]'],
    ['[[Alpha#Intro|see]]', '[[Alpha (2)#Intro|see]]'],
  ])('a page landing beside a new namesake rebuilds %s as %s', async (held, rebuilt) => {
    await linker(beta, BETA_ID, `Related: "${held}"`)
    await del('Journal/Daily/Alpha.md', 'page')
    const created = await settledMutate(
      root,
      { op: 'createPage', id: newContentId('page'), parentPath: 'Journal/Daily', name: 'Alpha' },
      deps,
    )
    expect(created.ok).toBe(true)
    expect(await restore('Alpha')).toBeUndefined()
    expect(await pathExists(join(root, 'Journal', 'Daily', 'Alpha (2).md'))).toBe(true)
    expect((await frontmatter()).Related).toBe(rebuilt)
  })

  it('a key given another value meanwhile keeps it, and the restore names its page once', async () => {
    await linker(beta, BETA_ID, 'Related: "[[Alpha]]"\nParent: "[[Alpha]]"')
    await del('Journal/Daily/Alpha.md', 'page')
    expect((await relink('prop_related')).ok).toBe(true)
    expect((await relink('prop_parent')).ok).toBe(true)
    const { bundlePath } = await find('Alpha')
    expect(await restore('Alpha')).toEqual(['Beta'])
    expect(await frontmatter()).toMatchObject({ Related: '[[Other]]', Parent: '[[Other]]' })
    expect(await pathExists(join(root, bundlePath))).toBe(false)
  })

  it('a page landing under its own name gets each value back as it was spelled', async () => {
    await linker(beta, BETA_ID, 'Related: "[[alpha#Intro]]"')
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[[alpha#Intro]]')
  })

  it('a property renamed meanwhile takes the value back under its new name', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    expect((await renameProperty(root, 'prop_related', 'See Also')).ok).toBe(true)
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter())['See Also']).toBe('[[Alpha]]')
  })

  it('a property deleted meanwhile is left out', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    expect((await deleteProperty(root, 'prop_related')).ok).toBe(true)
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBeUndefined()
  })

  it('a Set restore writes back the values its pages lost outside it, verbatim', async () => {
    const gamma = join('Plain', 'Gamma.md')
    await linker(gamma, '01KVGMT8BFP350FZZXAMG1QDVD', 'Related: "[[Alpha]]"')
    await del('Journal/Daily', 'set')
    expect((await frontmatter(gamma)).Related).toBeUndefined()
    expect(await restore('Daily')).toBeUndefined()
    expect((await frontmatter(gamma)).Related).toBe('[[Alpha]]')
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('a Set landing beside a new namesake keeps its inner namesake’s values as they were', async () => {
    const gamma = join('Plain', 'Gamma.md')
    await linker(join('Journal', 'Daily', 'Daily.md'), '01KVGMT8BFP350FZZXAMG1QDVE', '')
    await linker(gamma, '01KVGMT8BFP350FZZXAMG1QDVD', 'Parent: "[[Daily]]"')
    await del('Journal/Daily', 'set')
    const created = await settledMutate(
      root,
      { op: 'createContainer', id: newId(), parentPath: 'Journal', kind: 'set', name: 'Daily' },
      deps,
    )
    expect(created.ok).toBe(true)
    expect(await restore('Daily')).toBeUndefined()
    expect(await pathExists(join(root, 'Journal', 'Daily (2)', 'Daily.md'))).toBe(true)
    expect((await frontmatter(gamma)).Parent).toBe('[[Daily]]')
  })

  const recordOf = async (title: string) => readRecord(join(root, (await find(title)).bundlePath))
  const empty = async (title: string) => {
    const { bundlePath } = await find(title)
    expect((await settledMutate(root, { op: 'emptyBundle', bundlePath }, deps)).ok).toBe(true)
  }

  it('a page restored while its link’s page sits in the Trash comes back without it, and that page’s restore puts it back', async () => {
    await del(beta, 'page')
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await restore('Beta')).toBeUndefined()
    expect(await frontmatter()).not.toHaveProperty('Related')
    expect(await recordOf('Alpha')).toMatchObject({
      links: [{ page: BETA_ID, property: 'prop_related', value: '[[Alpha]]' }],
    })
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('a page restored once its link’s page was emptied comes back without it', async () => {
    await del(beta, 'page')
    await del('Journal/Daily/Alpha.md', 'page')
    await empty('Alpha')
    expect(await restore('Beta')).toBeUndefined()
    expect(await frontmatter()).not.toHaveProperty('Related')
  })

  it('a page restored beside its link’s page keeps the link', async () => {
    await del(beta, 'page')
    expect(await restore('Beta')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('a Set restore parks a link naming a page in the Trash and keeps one naming a page it carries', async () => {
    const box = join('Plain', 'Box')
    const gamma = join(box, 'Gamma.md')
    await mkdir(join(root, box), { recursive: true })
    await writeFile(join(root, box, '_pageset.json'), JSON.stringify({ id: 'set-box' }))
    await linker(join(box, 'Omega.md'), '01KVGMT8BFP350FZZXAMG1QDVF', '')
    await linker(gamma, '01KVGMT8BFP350FZZXAMG1QDVD', 'Related: "[[Alpha]]"\nParent: "[[Omega]]"')
    await del(box, 'set')
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await restore('Box')).toBeUndefined()
    expect(await frontmatter(gamma)).toMatchObject({ Parent: '[[Omega]]' })
    expect(await frontmatter(gamma)).not.toHaveProperty('Related')
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter(gamma)).Related).toBe('[[Alpha]]')
  })

  it('a Space restored while its link’s page sits in the Trash comes back without it, and that page’s restore puts it back', async () => {
    const sidecar = join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
    await writeFile(sidecar, JSON.stringify({ id: 'sp-pom', Related: '[[Alpha]]' }))
    await del('.nexus/contexts/Projects/Pommora', 'space')
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await restore('Pommora')).toBeUndefined()
    expect(JSON.parse(await readFile(sidecar, 'utf8'))).not.toHaveProperty('Related')
    expect(await restore('Alpha')).toBeUndefined()
    expect(JSON.parse(await readFile(sidecar, 'utf8')).Related).toBe('[[Alpha]]')
  })

  it('a restore leaves a foreign key’s list and blank alone, on a page and on a Space', async () => {
    const notes = join('Plain', 'Notes.md')
    await linker(
      notes,
      '01KVGMT8BFP350FZZXAMG1QDVD',
      'Related:\n  - "[[Alpha]]"\n  - "[[Beta]]"\nParent:',
    )
    const sidecar = join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
    const space = { id: 'sp-pom', Mentions: ['[[Alpha]]', '[[Beta]]'], Upstream: '' }
    await writeFile(sidecar, JSON.stringify(space))
    const before = await readFile(join(root, notes), 'utf8')
    await del(notes, 'page')
    expect(await restore('Notes')).toBeUndefined()
    expect(await readFile(join(root, notes), 'utf8')).toBe(before)
    await del('.nexus/contexts/Projects/Pommora', 'space')
    expect(await restore('Pommora')).toBeUndefined()
    expect(JSON.parse(await readFile(sidecar, 'utf8'))).toMatchObject(space)
  })

  it('a page with no ID isn’t held, so its delete refuses and leaves its bytes', async () => {
    const gamma = join('Plain', 'Gamma.md')
    const content = '---\nRelated: "[[Alpha]]"\n---\ng\n'
    await writeFile(join(root, gamma), content)
    await refreshTree(root)
    const r = await settledMutate(root, { op: 'delete', path: gamma, kind: 'page' }, deps)
    expect(r.ok).toBe(false)
    expect(await listBundles(root)).toEqual([])
    expect(await readFile(join(root, gamma), 'utf8')).toBe(content)
  })

  it('a property restored while its link’s page sits in the Trash parks the value for that page', async () => {
    await linker(beta, BETA_ID, '')
    await del('Journal/Daily/Alpha.md', 'page')
    await linker(beta, BETA_ID, 'Related: "[[Alpha]]"')
    expect((await deleteProperty(root, 'prop_related')).ok).toBe(true)
    expect(await restore('Related')).toBeUndefined()
    expect(await frontmatter()).not.toHaveProperty('Related')
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('a link parks with the newest of two namesakes in the Trash', async () => {
    const plain = join('Plain', 'Alpha.md')
    await linker(plain, newContentId('page'), '')
    await del(beta, 'page')
    await del('Journal/Daily/Alpha.md', 'page')
    await del(plain, 'page')
    expect(await restore('Beta')).toBeUndefined()
    const alphas = (await rows()).filter((r) => r.title === 'Alpha')
    const newest = alphas.find((r) => r.bundlePath.startsWith('.trash/Plain'))
    const older = alphas.find((r) => r.bundlePath.startsWith('.trash/Journal'))
    if (!newest || !older) throw new Error('setup failed')
    expect(await readRecord(join(root, newest.bundlePath))).toMatchObject({
      links: [{ page: BETA_ID, property: 'prop_related', value: '[[Alpha]]' }],
    })
    expect(await readRecord(join(root, older.bundlePath))).not.toHaveProperty('links')
  })

  it('emptying one of two namesakes hands its record’s links to the other', async () => {
    const plain = join('Plain', 'Alpha.md')
    await linker(plain, newContentId('page'), '')
    await del(plain, 'page')
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await frontmatter()).not.toHaveProperty('Related')
    const alphas = (await rows()).filter((r) => r.title === 'Alpha')
    const daily = alphas.find((r) => r.bundlePath.startsWith('.trash/Journal'))
    const kept = alphas.find((r) => r.bundlePath.startsWith('.trash/Plain'))
    if (!daily || !kept) throw new Error('setup failed')
    const emptied = await settledMutate(
      root,
      { op: 'emptyBundle', bundlePath: daily.bundlePath },
      deps,
    )
    expect(emptied.ok).toBe(true)
    const restored = await settledMutate(root, { op: 'restore', bundlePath: kept.bundlePath }, deps)
    expect(restored.ok).toBe(true)
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('a Set restore reports the values of every page it lands, so the window rereads what the restore dropped', async () => {
    const box = join('Plain', 'Box')
    const gamma = join(box, 'Gamma.md')
    await mkdir(join(root, box), { recursive: true })
    await writeFile(join(root, box, '_pageset.json'), JSON.stringify({ id: 'set-box' }))
    await linker(gamma, '01KVGMT8BFP350FZZXAMG1QDVD', 'Related: "[[Alpha]]"')
    await del(box, 'set')
    await del('Journal/Daily/Alpha.md', 'page')
    const { bundlePath } = await find('Box')
    const r = await handleMutate(root, { op: 'restore', bundlePath }, deps)
    expect(r.ok && r.value.unrestored).toBeUndefined()
    const changed: string[] = []
    const push = (channel: keyof Pushes, value: unknown): void => {
      if (channel === 'values:changed')
        changed.push(...(value as ValueChange[]).flatMap((c) => c.pageIds))
    }
    await settleNow({ push, watch: async () => {} }, root)
    expect(changed).toContain('01KVGMT8BFP350FZZXAMG1QDVD')
  })

  it('emptying a page strips a Link value a page took up for it since the delete', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    await linker(beta, BETA_ID, 'Related: "[[Alpha]]"')
    await empty('Alpha')
    expect(await frontmatter()).not.toHaveProperty('Related')
  })

  it('emptying a page parks a Link value its namesake in the Trash still answers', async () => {
    await linker(beta, BETA_ID, '')
    await linker(join('Plain', 'Alpha.md'), '01KVGMT8BFP350FZZXAMG1QDVF', '')
    await del('Journal/Daily/Alpha.md', 'page')
    await del('Plain/Alpha.md', 'page')
    await linker(beta, BETA_ID, 'Related: "[[Alpha]]"')
    const alphas = (await rows()).filter((r) => r.title === 'Alpha')
    const daily = alphas.find((r) => r.bundlePath.startsWith('.trash/Journal'))
    const plain = alphas.find((r) => r.bundlePath.startsWith('.trash/Plain'))
    if (!daily || !plain) throw new Error('setup failed')
    const emptied = await settledMutate(
      root,
      { op: 'emptyBundle', bundlePath: daily.bundlePath },
      deps,
    )
    expect(emptied.ok).toBe(true)
    expect(await frontmatter()).not.toHaveProperty('Related')
    const restored = await settledMutate(
      root,
      { op: 'restore', bundlePath: plain.bundlePath },
      deps,
    )
    expect(restored.ok).toBe(true)
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('emptying a page keeps a Link value a new namesake answers', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    const created = await settledMutate(
      root,
      { op: 'createPage', id: newContentId('page'), parentPath: 'Journal/Daily', name: 'Alpha' },
      deps,
    )
    expect(created.ok).toBe(true)
    await linker(beta, BETA_ID, 'Related: "[[Alpha]]"')
    await empty('Alpha')
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  const journal = () => join(root, 'Journal')
  const cachedIn = async () =>
    JSON.parse(await readFile(join(journal(), '_pagecollection.json'), 'utf8')).property_cache
      ?.prop_related?.values

  it('a Space’s Link value leaves with the page and comes back with it', async () => {
    const sidecar = join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
    await writeFile(sidecar, JSON.stringify({ id: 'sp-pom', Related: '[[Alpha]]' }))
    await del('Journal/Daily/Alpha.md', 'page')
    expect(JSON.parse(await readFile(sidecar, 'utf8'))).not.toHaveProperty('Related')
    expect(await restore('Alpha')).toBeUndefined()
    expect(JSON.parse(await readFile(sidecar, 'utf8')).Related).toBe('[[Alpha]]')
  })

  it('a delete leaves a cached Link value, and re-assigning hands one whose page sits in the Trash to that page', async () => {
    expect((await removeProperty(root, journal(), 'prop_related')).ok).toBe(true)
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await cachedIn()).toEqual({ [BETA_ID]: '[[Alpha]]' })
    expect((await assignProperty(root, journal(), 'prop_related')).ok).toBe(true)
    expect(await frontmatter()).not.toHaveProperty('Related')
    expect(await cachedIn()).toBeUndefined()
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('re-assigning brings a cached Link back once its page is restored, and drops one naming nothing', async () => {
    expect((await removeProperty(root, journal(), 'prop_related')).ok).toBe(true)
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await restore('Alpha')).toBeUndefined()
    expect((await assignProperty(root, journal(), 'prop_related')).ok).toBe(true)
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
    expect((await removeProperty(root, journal(), 'prop_related')).ok).toBe(true)
    await del('Journal/Daily/Alpha.md', 'page')
    await empty('Alpha')
    expect((await assignProperty(root, journal(), 'prop_related')).ok).toBe(true)
    expect(await frontmatter()).not.toHaveProperty('Related')
    expect(await cachedIn()).toBeUndefined()
  })

  it('a page restored while its linker sits in the Trash writes the value into the linker’s trashed copy', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    await del(beta, 'page')
    expect(await restore('Alpha')).toBeUndefined()
    expect(await restore('Beta')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('a page restored while a linking Space sits in the Trash writes the value into the Space’s trashed copy', async () => {
    const sidecar = join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
    await writeFile(sidecar, JSON.stringify({ id: 'sp-pom', Related: '[[Alpha]]' }))
    await del('Journal/Daily/Alpha.md', 'page')
    await del('.nexus/contexts/Projects/Pommora', 'space')
    expect(await restore('Alpha')).toBeUndefined()
    expect(await restore('Pommora')).toBeUndefined()
    expect(JSON.parse(await readFile(sidecar, 'utf8')).Related).toBe('[[Alpha]]')
  })

  describe('with Restore Links On Deletion off', () => {
    beforeEach(() =>
      writeFile(
        join(root, '.nexus', 'settings.json'),
        JSON.stringify({ personalization: { restoreLinksOnDeletion: false } }),
      ),
    )

    it('a page restored while its link’s page sits in the Trash comes back without it, and that page’s restore leaves it removed', async () => {
      await del(beta, 'page')
      await del('Journal/Daily/Alpha.md', 'page')
      expect(await restore('Beta')).toBeUndefined()
      expect(await frontmatter()).not.toHaveProperty('Related')
      expect(await restore('Alpha')).toBeUndefined()
      expect(await frontmatter()).not.toHaveProperty('Related')
    })

    it('re-assigning drops a cached link whose page sits in the Trash, as it drops one naming nothing', async () => {
      await linker(beta, BETA_ID, 'Related: "[[Alpha]]"\nParent: "[[Nowhere]]"')
      expect((await removeProperty(root, journal(), 'prop_related')).ok).toBe(true)
      expect((await removeProperty(root, journal(), 'prop_parent')).ok).toBe(true)
      await del('Journal/Daily/Alpha.md', 'page')
      expect((await assignProperty(root, journal(), 'prop_related')).ok).toBe(true)
      expect((await assignProperty(root, journal(), 'prop_parent')).ok).toBe(true)
      expect(await frontmatter()).not.toHaveProperty('Related')
      expect(await frontmatter()).not.toHaveProperty('Parent')
    })
  })

  it('with Restore Links On Deletion off, the values stay removed', async () => {
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ personalization: { restoreLinksOnDeletion: false } }),
    )
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBeUndefined()
    expect(await rows()).toHaveLength(0)
  })
})
