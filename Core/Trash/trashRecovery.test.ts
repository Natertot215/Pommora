// Every restoration combination the surface can produce, driven through the same ops the leaf calls, against a real nexus on disk.
import { chmod, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import {
  bytesUnder,
  putJson,
  readJsonAt,
  failLandings,
  noModeBits,
  tempRoot,
} from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { installMachine, machine } from '../Platform/machine'
import { diskMachine } from '../Testing/machines'
import { pathExists } from '../Files/atomicWrite'
import { settledMutate } from '../Testing/settledMutate'
import { contextsDir, contextsRegistryFile, tileDocPath } from '../Paths/paths'
import * as bundle from '../Bundles/bundle'
import { listBundles } from '../Bundles/bundle'
import { parkLinks } from './gather'
import { readRecord } from '../Bundles/record'
import * as cascade from '../Nexus/cascade'
import { bundleRows } from '../Bundles/rows'
import { readNexus } from '../Nexus/readNexus'
import { settleArchives } from '../Archive/refile'
import { nexusPages } from '../Nexus/heldPages'
import { closeSession, openSession } from '../Nexus/session'
import { splitFrontmatter } from '../Files/pageFile'
import { deleteProperty } from '../Properties/deleteProperty'
import { unassignProperty } from '../Properties/unassignProperty'
import { assignProperty } from '../Properties/assignment'
import { newContentId, newId } from '../Nexus/ids'
import { handleMutate } from '../Nexus/mutate'
import { settleNow } from '../Nexus/settle'
import type { ValueChange } from '../Nexus/tree'
import type { Pushes } from '../Contract/bridge'
import { renameProperty } from '../Properties/registryProperty'
import { setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
import type { RestoreDestination } from '../Nexus/mutateRequest'
import { readNotes } from '../Nexus/owed'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { stateOrder } from '../Testing/bundles'
import { seedContentIndex } from '../Index/indexSeed'

let root: string
const rows = async () => {
  const tree = await readNexus(root)
  const { byId } = await nexusPages(root, tree)
  return bundleRows(await listBundles(root, { kind: 'trash' }), tree, byId)
}
const find = async (title: string) => {
  const hit = (await rows()).find((r) => r.title === title)
  expect(hit, `no row titled ${title}`).toBeDefined()
  return hit as NonNullable<typeof hit>
}
const del = async (path: string, kind: string) => {
  await refreshTree(root)
  const r = await settledMutate(root, { op: 'delete', path, kind } as never)
  expect(r.ok, `delete ${path}`).toBe(true)
}
const beta = join('Journal', 'Daily', 'Beta.md')
const BETA_ID = '01KVGMT8BFP350FZZXAMG1QDVC'
const linker = (rel: string, id: string, keys: string) =>
  writeFile(join(root, rel), `---\nID: ${id}\n${keys}\n---\nlinker\n`)
const ALPHA_ID = '01KVGMT8BFP350FZZXAMG1QDVA'
const ALEPH_ID = '01KVGMT8BFP350FZZXAMG1QDV0'
const page = (rel: string, id: string) => writeFile(join(root, rel), `---\nID: ${id}\n---\nbody\n`)
const sidecarOrder = async (rel: string, key: string): Promise<unknown> =>
  JSON.parse(await readFile(join(root, rel), 'utf8'))[key]
const restoreRow = async (title: string) => {
  const row = await find(title)
  const r = await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath })
  expect(r.ok, `restore ${title}`).toBe(true)
}
const frontmatter = async (rel = beta) => splitFrontmatter(await readFile(join(root, rel), 'utf8'))

beforeEach(async () => {
  installMachine({ ...diskMachine(), trashToSystem: (p) => rm(p, { recursive: true }) })
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
          label: 'Status',
          key: 'Status',
          type: 'select',
          select_options: [{ key: 'live', label: 'live', color: 'green' }],
        },
        prop_related: { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
        prop_parent: { id: 'prop_parent', label: 'Parent', key: 'Parent', type: 'link' },
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
  installMachine(diskMachine())
  vi.restoreAllMocks()
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('end to end — deleted, listed, restored', () => {
  it('a page deleted and restored comes back between its old neighbours, and leaves the list', async () => {
    await page(join('Journal', 'Daily', 'Aleph.md'), ALEPH_ID)
    await writeFile(
      join(root, 'Journal', 'Daily', '_pageset.json'),
      JSON.stringify({ id: 'set-daily', page_order: [BETA_ID, ALPHA_ID, ALEPH_ID] }),
    )
    await del('Journal/Daily/Alpha.md', 'page')
    const row = await find('Alpha')
    expect(row.homeResolves).toBe(true)
    expect(row.crumbs.map((c) => c.title)).toEqual(['Journal', 'Daily'])
    const r = await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath })
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Journal', 'Daily', 'Alpha.md'))).toBe(true)
    expect(await sidecarOrder('Journal/Daily/_pageset.json', 'page_order')).toEqual([
      BETA_ID,
      ALPHA_ID,
      ALEPH_ID,
    ])
    expect(await rows()).toHaveLength(0)
  })

  it('a Set restored returns to its slot in set_order', async () => {
    for (const [name, id] of [
      ['Weekly', 'set-week'],
      ['Monthly', 'set-month'],
    ]) {
      await mkdir(join(root, 'Journal', name), { recursive: true })
      await writeFile(join(root, 'Journal', name, '_pageset.json'), JSON.stringify({ id }))
    }
    const journal = JSON.parse(
      await readFile(join(root, 'Journal', '_pagecollection.json'), 'utf8'),
    )
    const order = ['set-week', 'set-daily', 'set-month']
    await writeFile(
      join(root, 'Journal', '_pagecollection.json'),
      JSON.stringify({ ...journal, set_order: order }),
    )
    await del('Journal/Daily', 'set')
    await restoreRow('Daily')
    expect(await sidecarOrder('Journal/_pagecollection.json', 'set_order')).toEqual(order)
  })

  it('a Collection restored returns to its slot in state.order.collections', async () => {
    await mkdir(join(root, 'Zed'), { recursive: true })
    await writeFile(join(root, 'Zed', '_pagecollection.json'), JSON.stringify({ id: 'col-zed' }))
    const order = ['col-plain', 'col-journal', 'col-zed']
    await setCollectionOrder(root, order)
    await del('Journal', 'collection')
    await restoreRow('Journal')
    expect((await stateOrder(root)).collections).toEqual(order)
  })

  it('a Space restored returns to its slot in its Context’s Space order', async () => {
    for (const [space, id] of [
      ['Sapphire', 'sp-sap'],
      ['Zeta', 'sp-zeta'],
    ]) {
      await mkdir(join(contextsDir(root), 'Projects', space), { recursive: true })
      await writeFile(
        join(contextsDir(root), 'Projects', space, '_space.json'),
        JSON.stringify({ id }),
      )
    }
    const order = ['sp-sap', 'sp-pom', 'sp-zeta']
    await setSpaceOrder(root, 'ctx_projects', order)
    await del('.nexus/contexts/Projects/Pommora', 'space')
    await restoreRow('Pommora')
    expect((await stateOrder(root)).spaces).toMatchObject({ ctx_projects: order })
  })

  it('a restore into a folder with no written order writes the order the folder showed, with the page in its slot', async () => {
    await page(join('Journal', 'Daily', 'Aleph.md'), ALEPH_ID)
    await del('Journal/Daily/Alpha.md', 'page')
    await restoreRow('Alpha')
    expect(await sidecarOrder('Journal/Daily/_pageset.json', 'page_order')).toEqual([
      ALEPH_ID,
      ALPHA_ID,
      BETA_ID,
    ])
  })

  it('a record from before the place was kept lands last, the order written whole', async () => {
    await page(join('Journal', 'Daily', 'Aleph.md'), ALEPH_ID)
    await del('Journal/Daily/Alpha.md', 'page')
    const row = await find('Alpha')
    const recordFile = join(root, row.bundlePath, '_record.json')
    const { place: _, ...older } = JSON.parse(await readFile(recordFile, 'utf8'))
    await writeFile(recordFile, JSON.stringify(older))
    expect((await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath })).ok).toBe(true)
    expect(await sidecarOrder('Journal/Daily/_pageset.json', 'page_order')).toEqual([
      ALEPH_ID,
      BETA_ID,
      ALPHA_ID,
    ])
  })

  it('a renamed parent is followed — the row reads the new name and the file lands in it', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    expect(
      (
        await settledMutate(root, {
          op: 'rename',
          path: 'Journal',
          kind: 'collection',
          newName: 'Logbook',
        })
      ).ok,
    ).toBe(true)
    const row = await find('Alpha')
    expect(row.crumbs.map((c) => c.title)).toEqual(['Logbook', 'Daily'])
    expect((await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath })).ok).toBe(true)
    expect(await pathExists(join(root, 'Logbook', 'Daily', 'Alpha.md'))).toBe(true)
    expect(await rows()).toHaveLength(0)
  })

  it('a Space restores into a RENAMED Context, and its breadcrumb said so first', async () => {
    await del('.nexus/contexts/Projects/Pommora', 'space')
    expect(
      (
        await settledMutate(root, {
          op: 'renameContext',
          contextId: 'ctx_projects',
          newName: 'Ventures',
        })
      ).ok,
    ).toBe(true)
    const row = await find('Pommora')
    expect(row.crumbs).toEqual([{ kind: 'context', title: 'Ventures' }])
    expect((await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath })).ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora', '_space.json'))).toBe(
      true,
    )
  })

  it('every restoration case: each homeless kind lands where it is told', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    let row = await find('Alpha')
    expect(
      (
        await settledMutate(root, {
          op: 'restore',
          bundlePath: row.bundlePath,
          destination: { kind: 'container', id: 'set-daily' },
        })
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Journal', 'Daily', 'Alpha.md'))).toBe(true)

    // page → Collection, with its Set gone: the plain restore refuses first, nothing climbs
    await del('Journal/Daily/Alpha.md', 'page')
    await del('Journal/Daily', 'set')
    row = await find('Alpha')
    expect(row.homeResolves).toBe(false)
    expect(row.historical).toBe(true)
    expect((await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath })).ok).toBe(
      false,
    )
    expect(
      (
        await settledMutate(root, {
          op: 'restore',
          bundlePath: row.bundlePath,
          destination: { kind: 'container', id: 'col-journal' },
        })
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Journal', 'Alpha.md'))).toBe(true)

    const setRow = await find('Daily')
    expect(
      (
        await settledMutate(root, {
          op: 'restore',
          bundlePath: setRow.bundlePath,
          destination: { kind: 'container', id: 'col-journal' },
        })
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Journal', 'Daily', '_pageset.json'))).toBe(true)

    await del('.nexus/contexts/Projects/Pommora', 'space')
    await del('.nexus/contexts/Projects', 'context')
    const spaceRow = await find('Pommora')
    expect(spaceRow.homeResolves).toBe(false)
    expect(
      (
        await settledMutate(root, {
          op: 'restore',
          bundlePath: spaceRow.bundlePath,
          destination: { kind: 'context', id: 'ctx_areas' },
        })
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
        await settledMutate(root, {
          op: 'restore',
          bundlePath: row.bundlePath,
          destination: { kind: 'container', id: 'col-plain' },
        })
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
      expect((await settledMutate(root, { op: 'restore', bundlePath: r.bundlePath })).ok).toBe(true)
    expect((await rows()).map((r) => r.title)).toEqual(['Alpha'])
  })
})

describe('links come back with the page', () => {
  const restore = async (title: string) => {
    const { bundlePath } = await find(title)
    const r = await settledMutate(root, { op: 'restore', bundlePath })
    expect(r.ok, `restore ${title}`).toBe(true)
    return r.ok ? r.value.unrestored : undefined
  }
  const relink = (propertyId: string) =>
    settledMutate(root, {
      op: 'setProperty',
      path: beta,
      propertyId,
      value: { kind: 'link', value: '[[Other]]' },
    })

  it('a restored page writes its Link values back onto the pages they came from', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    expect((await frontmatter()).Related).toBeUndefined()
    expect((await listBundles(root, { kind: 'trash' }))[0].record).toMatchObject({
      links: [{ page: BETA_ID, property: 'prop_related', value: '[[Alpha]]' }],
    })
    expect(await restore('Alpha')).toBeUndefined()
    expect(await frontmatter()).toMatchObject({ Related: '[[Alpha]]' })
    expect(await frontmatter()).not.toHaveProperty('Parent')
    expect(await rows()).toHaveLength(0)
  })

  it('a hand-written markdown Link value leaves with its page and comes back as written', async () => {
    await linker(beta, BETA_ID, 'Related: "[x](Alpha)"')
    await del('Journal/Daily/Alpha.md', 'page')
    expect((await frontmatter()).Related).toBeUndefined()
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[x](Alpha)')
  })

  it('a page restored while its markdown link’s page sits in the Trash parks it for that page', async () => {
    await linker(beta, BETA_ID, 'Related: "[x](Alpha)"')
    await del(beta, 'page')
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await restore('Beta')).toBeUndefined()
    expect(await frontmatter()).not.toHaveProperty('Related')
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[x](Alpha)')
  })

  it('a page restored while its unquoted link’s page sits in the Trash parks the link it spells', async () => {
    await linker(beta, BETA_ID, 'Related: [[Alpha]]')
    await del(beta, 'page')
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await restore('Beta')).toBeUndefined()
    expect(await frontmatter()).not.toHaveProperty('Related')
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it.each([
    ['[[Alpha]]', '[[Alpha (2)]]'],
    ['[[Alpha#Intro|see]]', '[[Alpha (2)#Intro|see]]'],
  ])('a page landing beside a new namesake rebuilds %s as %s', async (held, rebuilt) => {
    await linker(beta, BETA_ID, `Related: "${held}"`)
    await del('Journal/Daily/Alpha.md', 'page')
    const created = await settledMutate(root, {
      op: 'createPage',
      id: newContentId('page'),
      parentPath: 'Journal/Daily',
      name: 'Alpha',
    })
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
    const created = await settledMutate(root, {
      op: 'createContainer',
      id: newId(),
      parentPath: 'Journal',
      kind: 'set',
      name: 'Daily',
    })
    expect(created.ok).toBe(true)
    expect(await restore('Daily')).toBeUndefined()
    expect(await pathExists(join(root, 'Journal', 'Daily (2)', 'Daily.md'))).toBe(true)
    expect((await frontmatter(gamma)).Parent).toBe('[[Daily]]')
  })

  const recordOf = async (title: string) => readRecord(join(root, (await find(title)).bundlePath))
  const empty = async (title: string) => {
    const { bundlePath } = await find(title)
    expect((await settledMutate(root, { op: 'emptyBundle', bundlePath })).ok).toBe(true)
  }

  it.skipIf(noModeBits)(
    'a value taken up while the delete is owed joins the record before Try Again strips it',
    async () => {
      const gamma = join('Journal', 'Gamma.md')
      const GAMMA_ID = '01KVGMT8BFP350FZZXAMG1QDVD'
      await page(gamma, GAMMA_ID)
      await chmod(join(root, beta), 0o000)
      try {
        await del('Journal/Daily/Alpha.md', 'page')
      } finally {
        await chmod(join(root, beta), 0o644)
      }
      await refreshTree(root)
      expect(await readNotes(root)).not.toEqual({})
      const typed = await settledMutate(root, {
        op: 'setProperty',
        path: gamma,
        propertyId: 'prop_related',
        value: { kind: 'link', value: '[[Alpha]]' },
      })
      expect(typed.ok).toBe(true)
      expect((await settledMutate(root, { op: 'finishOwed' })).ok).toBe(true)
      expect(await readNotes(root)).toEqual({})
      expect(await recordOf('Alpha')).toMatchObject({
        links: expect.arrayContaining([
          { page: BETA_ID, property: 'prop_related', value: '[[Alpha]]' },
          { page: GAMMA_ID, property: 'prop_related', value: '[[Alpha]]' },
        ]),
      })
      expect(await restore('Alpha')).toBeUndefined()
      expect((await frontmatter()).Related).toBe('[[Alpha]]')
      expect((await frontmatter(gamma)).Related).toBe('[[Alpha]]')
    },
  )

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
    const r = await settledMutate(root, { op: 'delete', path: gamma, kind: 'page' })
    expect(r.ok).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
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

  it('a property restored while its unquoted link’s page sits in the Trash parks the link it spells', async () => {
    await linker(beta, BETA_ID, '')
    await del('Journal/Daily/Alpha.md', 'page')
    await linker(beta, BETA_ID, 'Related: [[Alpha]]')
    expect((await deleteProperty(root, 'prop_related')).ok).toBe(true)
    expect(await restore('Related')).toBeUndefined()
    expect(await frontmatter()).not.toHaveProperty('Related')
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('a link parks with the only trashed page its bare title names', async () => {
    await linker(join('Plain', 'Notes.md'), newContentId('page'), '')
    await del(join('Plain', 'Notes.md'), 'page')
    const link = { page: BETA_ID, property: 'prop_related', value: '[[Notes]]' }
    await parkLinks(root, [link])
    expect(await readRecord(join(root, (await find('Notes')).bundlePath))).toMatchObject({
      links: [link],
    })
  })

  it('a link parks with the trashed page its path names, and with neither of two namesakes its bare title names', async () => {
    const plain = join('Plain', 'Alpha.md')
    await linker(plain, newContentId('page'), '')
    await linker(beta, BETA_ID, '')
    await del('Journal/Daily/Alpha.md', 'page')
    await del(plain, 'page')
    const alphas = (await rows()).filter((r) => r.title === 'Alpha')
    const inPlain = alphas.find((r) => r.bundlePath.startsWith('.trash/Plain'))
    const inJournal = alphas.find((r) => r.bundlePath.startsWith('.trash/Journal'))
    if (!inPlain || !inJournal) throw new Error('setup failed')
    const bare = { page: BETA_ID, property: 'prop_related', value: '[[Alpha]]' }
    const pathed = { page: BETA_ID, property: 'prop_parent', value: '[[Plain/Alpha]]' }
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const reads = vi.spyOn(machine(), 'readText')
    try {
      await parkLinks(root, [bare, pathed])
      expect(reads.mock.calls.filter(([file]) => file.endsWith('.md'))).toEqual([])
    } finally {
      reads.mockRestore()
      installStores(NO_STORES)
    }
    expect(await readRecord(join(root, inPlain.bundlePath))).toMatchObject({ links: [pathed] })
    expect(await readRecord(join(root, inJournal.bundlePath))).not.toHaveProperty('links')
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
    const emptied = await settledMutate(root, { op: 'emptyBundle', bundlePath: daily.bundlePath })
    expect(emptied.ok).toBe(true)
    const restored = await settledMutate(root, { op: 'restore', bundlePath: kept.bundlePath })
    expect(restored.ok).toBe(true)
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('emptying a Set holding one of two namesakes hands its record’s links to the other', async () => {
    await mkdir(join(root, 'Plain', 'Box'), { recursive: true })
    await writeFile(join(root, 'Plain', 'Box', '_pageset.json'), JSON.stringify({ id: 'set-box' }))
    await linker(join('Plain', 'Box', 'Alpha.md'), newContentId('page'), '')
    await del('Journal/Daily/Alpha.md', 'page')
    await del(join('Plain', 'Box'), 'set')
    expect(await frontmatter()).not.toHaveProperty('Related')
    const box = await find('Box')
    const emptied = await settledMutate(root, { op: 'emptyBundle', bundlePath: box.bundlePath })
    expect(emptied.ok).toBe(true)
    await restoreRow('Alpha')
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('an emptying that can’t spend its bundle has already handed its record’s links on', async () => {
    const plain = join('Plain', 'Alpha.md')
    await linker(plain, newContentId('page'), '')
    await del(plain, 'page')
    await del('Journal/Daily/Alpha.md', 'page')
    const alphas = (await rows()).filter((r) => r.title === 'Alpha')
    const daily = alphas.find((r) => r.bundlePath.startsWith('.trash/Journal'))
    const kept = alphas.find((r) => r.bundlePath.startsWith('.trash/Plain'))
    if (!daily || !kept) throw new Error('setup failed')
    const { links } = (await readRecord(join(root, daily.bundlePath))) as { links: unknown[] }
    expect(links).toHaveLength(1)
    vi.spyOn(bundle, 'spendBundle').mockRejectedValueOnce(new Error('the disk is gone'))
    await settledMutate(root, { op: 'emptyBundle', bundlePath: daily.bundlePath })
    expect(await readRecord(join(root, kept.bundlePath))).toMatchObject({ links })
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
    const r = await handleMutate(root, { op: 'restore', bundlePath })
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
    const emptied = await settledMutate(root, { op: 'emptyBundle', bundlePath: daily.bundlePath })
    expect(emptied.ok).toBe(true)
    expect(await frontmatter()).not.toHaveProperty('Related')
    const restored = await settledMutate(root, { op: 'restore', bundlePath: plain.bundlePath })
    expect(restored.ok).toBe(true)
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('an emptying parks a value its strip takes before the strip lands', async () => {
    await linker(beta, BETA_ID, '')
    await linker(join('Plain', 'Alpha.md'), '01KVGMT8BFP350FZZXAMG1QDVF', '')
    await del('Journal/Daily/Alpha.md', 'page')
    await del('Plain/Alpha.md', 'page')
    await linker(beta, BETA_ID, 'Related: "[[Alpha]]"')
    const alphas = (await rows()).filter((r) => r.title === 'Alpha')
    const daily = alphas.find((r) => r.bundlePath.startsWith('.trash/Journal'))
    const plain = alphas.find((r) => r.bundlePath.startsWith('.trash/Plain'))
    if (!daily || !plain) throw new Error('setup failed')
    const strip = cascade.deleteCascade
    let atStrip: unknown
    vi.spyOn(cascade, 'deleteCascade').mockImplementation(async (...args) => {
      atStrip = await readRecord(join(root, plain.bundlePath))
      return strip(...args)
    })
    const emptied = await settledMutate(root, { op: 'emptyBundle', bundlePath: daily.bundlePath })
    expect(emptied.ok).toBe(true)
    expect(atStrip).toMatchObject({ links: [{ page: BETA_ID, value: '[[Alpha]]' }] })
  })

  it('emptying a page keeps a Link value a new namesake answers', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    const created = await settledMutate(root, {
      op: 'createPage',
      id: newContentId('page'),
      parentPath: 'Journal/Daily',
      name: 'Alpha',
    })
    expect(created.ok).toBe(true)
    await linker(beta, BETA_ID, 'Related: "[[Alpha]]"')
    await empty('Alpha')
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  const journal = () => join(root, 'Journal')
  const stashedIn = async () =>
    JSON.parse(await readFile(join(journal(), '_pagecollection.json'), 'utf8')).property_stash
      ?.prop_related?.values

  it('a Space’s Link value leaves with the page and comes back with it', async () => {
    const sidecar = join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
    await writeFile(sidecar, JSON.stringify({ id: 'sp-pom', Related: '[[Alpha]]' }))
    await del('Journal/Daily/Alpha.md', 'page')
    expect(JSON.parse(await readFile(sidecar, 'utf8'))).not.toHaveProperty('Related')
    expect(await restore('Alpha')).toBeUndefined()
    expect(JSON.parse(await readFile(sidecar, 'utf8')).Related).toBe('[[Alpha]]')
  })

  it('a delete leaves a stashed Link value, and re-assigning hands one whose page sits in the Trash to that page', async () => {
    expect((await unassignProperty(root, journal(), 'prop_related')).ok).toBe(true)
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await stashedIn()).toEqual({ [BETA_ID]: '[[Alpha]]' })
    expect((await assignProperty(root, journal(), 'prop_related')).ok).toBe(true)
    expect(await frontmatter()).not.toHaveProperty('Related')
    expect(await stashedIn()).toBeUndefined()
    expect(await restore('Alpha')).toBeUndefined()
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
  })

  it('re-assigning brings a stashed Link back once its page is restored, and drops one naming nothing', async () => {
    expect((await unassignProperty(root, journal(), 'prop_related')).ok).toBe(true)
    await del('Journal/Daily/Alpha.md', 'page')
    expect(await restore('Alpha')).toBeUndefined()
    expect((await assignProperty(root, journal(), 'prop_related')).ok).toBe(true)
    expect((await frontmatter()).Related).toBe('[[Alpha]]')
    expect((await unassignProperty(root, journal(), 'prop_related')).ok).toBe(true)
    await del('Journal/Daily/Alpha.md', 'page')
    await empty('Alpha')
    expect((await assignProperty(root, journal(), 'prop_related')).ok).toBe(true)
    expect(await frontmatter()).not.toHaveProperty('Related')
    expect(await stashedIn()).toBeUndefined()
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
      expect(await rows()).toHaveLength(0)
    })

    it('re-assigning drops a stashed link whose page sits in the Trash, as it drops one naming nothing', async () => {
      await linker(beta, BETA_ID, 'Related: "[[Alpha]]"\nParent: "[[Nowhere]]"')
      expect((await unassignProperty(root, journal(), 'prop_related')).ok).toBe(true)
      expect((await unassignProperty(root, journal(), 'prop_parent')).ok).toBe(true)
      await del('Journal/Daily/Alpha.md', 'page')
      expect((await assignProperty(root, journal(), 'prop_related')).ok).toBe(true)
      expect((await assignProperty(root, journal(), 'prop_parent')).ok).toBe(true)
      expect(await frontmatter()).not.toHaveProperty('Related')
      expect(await frontmatter()).not.toHaveProperty('Parent')
    })
  })
})

describe('an item pulled out of a trashed bundle', () => {
  const gamma = join('Plain', 'Gamma.md')
  const GAMMA_ID = '01KVGMT8BFP350FZZXAMG1QDVD'
  const INTO_JOURNAL: RestoreDestination = { kind: 'container', id: 'col-journal' }
  const INTO_PLAIN: RestoreDestination = { kind: 'container', id: 'col-plain' }
  const pull = (bundlePath: string, destination?: RestoreDestination) =>
    settledMutate(root, { op: 'restore', bundlePath, ...(destination ? { destination } : {}) })
  const bundleOf = async (title: string) => (await find(title)).bundlePath
  const listed = async (...segs: string[]) => (await readdir(join(root, ...segs))).sort()
  const owed = async () =>
    Object.values(await readNotes(root)).find((e) => e.kind === 'container')?.strip ?? []
  const located = (id: string) => ({
    id: `view_${id}`,
    name: id,
    type: 'table',
    filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values: [id] }] },
  })
  // Daily holding Sub, deleted while Plain's views naming both refuse their edit, so the delete owes it.
  const owingSetViews = async () => {
    await putJson(join(root, 'Journal', 'Daily', 'Sub', '_pageset.json'), { id: 'set-sub' })
    const sidecar = join(root, 'Plain', '_pagecollection.json')
    const views = ['set-daily', 'set-sub'].map(located)
    await writeFile(sidecar, JSON.stringify({ id: 'col-plain', views }))
    const refusal = failLandings((file) => file === sidecar)
    await del('Journal/Daily', 'set')
    refusal.mockRestore()
    return { sidecar, views, bundle: await bundleOf('Daily') }
  }
  const finish = async () => expect((await settledMutate(root, { op: 'finishOwed' })).ok).toBe(true)

  it('a page pulled from a trashed Set restores to a given container, and the bundle still holds its sibling', async () => {
    await del('Journal/Daily', 'set')
    const bundle = await bundleOf('Daily')
    expect((await pull(join(bundle, 'Daily', 'Alpha.md'), INTO_JOURNAL)).ok).toBe(true)
    expect((await frontmatter(join('Journal', 'Alpha.md'))).ID).toBe(ALPHA_ID)
    expect(await listed(bundle, 'Daily')).toEqual(['Beta.md', '_pageset.json'])
  })

  it('a kept Link value naming that page refills on its restore and leaves the bundle’s record', async () => {
    await linker(gamma, GAMMA_ID, 'Related: "[[Alpha]]"')
    await del('Journal/Daily', 'set')
    const bundle = await bundleOf('Daily')
    const kept = { page: GAMMA_ID, property: 'prop_related', value: '[[Alpha]]' }
    expect(await readRecord(join(root, bundle))).toMatchObject({ links: [kept] })
    expect((await pull(join(bundle, 'Daily', 'Alpha.md'), INTO_JOURNAL)).ok).toBe(true)
    expect((await frontmatter(gamma)).Related).toBe('[[Alpha]]')
    expect(await readRecord(join(root, bundle))).not.toHaveProperty('links')
  })

  it('the Set’s own later restore names nothing unrestored and writes nothing twice', async () => {
    await linker(gamma, GAMMA_ID, 'Related: "[[Alpha]]"')
    await del('Journal/Daily', 'set')
    const bundle = await bundleOf('Daily')
    expect((await pull(join(bundle, 'Daily', 'Alpha.md'), INTO_JOURNAL)).ok).toBe(true)
    const r = await pull(bundle)
    expect(r.ok).toBe(true)
    expect(r.ok && r.value).not.toHaveProperty('unrestored')
    expect((await frontmatter(gamma)).Related).toBe('[[Alpha]]')
    expect(await listed('Journal', 'Daily')).toEqual(['Beta.md', '_pageset.json'])
    expect(await rows()).toHaveLength(0)
  })

  it('an inner item restored with no destination is refused as homeless, and its bundle is left byte-identical', async () => {
    await del('Journal/Daily', 'set')
    const bundle = await bundleOf('Daily')
    const before = await bytesUnder(join(root, bundle))
    const r = await pull(join(bundle, 'Daily', 'Alpha.md'))
    expect(r.ok ? '' : r.error.message).toBe('The place this belonged to no longer exists.')
    expect(await bytesUnder(join(root, bundle))).toEqual(before)
  })

  it('a nested Set pulled out lands with its pages, and carries what was archived from within it into the landing Collection’s Archive', async () => {
    await putJson(join(root, 'Journal', 'Daily', 'Sub', '_pageset.json'), { id: 'set-sub' })
    await page(join('Journal', 'Daily', 'Sub', 'Deep.md'), GAMMA_ID)
    await page(join('Journal', 'Daily', 'Sub', 'Kept.md'), ALEPH_ID)
    await refreshTree(root)
    const archived = await settledMutate(root, {
      op: 'archive',
      path: 'Journal/Daily/Sub/Kept.md',
      kind: 'page',
    })
    expect(archived.ok).toBe(true)
    await del('Journal/Daily', 'set')
    const bundle = await bundleOf('Daily')
    expect((await pull(join(bundle, 'Daily', 'Sub'), INTO_PLAIN)).ok).toBe(true)
    expect(await listed('Plain', 'Sub')).toEqual(['Deep.md', '_pageset.json'])
    expect(await listed(bundle, 'Daily')).toEqual(['Alpha.md', 'Beta.md', '_pageset.json'])
    expect(await listBundles(root, { kind: 'archive', id: 'col-journal' })).toEqual([])
    const [refiled, ...rest] = await listBundles(root, { kind: 'archive', id: 'col-plain' })
    expect(rest).toEqual([])
    expect(refiled).toMatchObject({
      artifactName: 'Kept.md',
      record: { id: ALEPH_ID, parent: { kind: 'container', id: 'set-sub' }, trail: ['col-plain'] },
    })
  })

  it('a property deleted while a Collection sat in the Trash leaves its saved views, as a live Collection’s', async () => {
    const view = {
      id: 'view_main',
      name: 'Main',
      type: 'table',
      property_order: ['prop_status', 'prop_related'],
      hidden_properties: ['prop_status'],
      filter: { match: 'all', rules: [{ property_id: 'prop_status', op: 'is', values: ['live'] }] },
    }
    const sidecar = join(root, 'Journal', '_pagecollection.json')
    await putJson(sidecar, { ...(await readJsonAt(sidecar)), views: [view] })
    await del('Journal', 'collection')
    expect(
      (await settledMutate(root, { op: 'deleteProperty', propertyId: 'prop_status' })).ok,
    ).toBe(true)
    await restoreRow('Journal')
    const [kept] = (await readJsonAt(sidecar)).views as Record<string, unknown>[]
    expect(kept).toMatchObject({ id: 'view_main', property_order: ['prop_related'] })
    expect(JSON.stringify(kept)).not.toContain('prop_status')
  })

  it('a trashed Space’s tile docs lose a deleted Collection’s sources, as a live Space’s do', async () => {
    const doc = {
      tiles: [
        {
          id: 't',
          type: 'view',
          views: [{ source_id: 'col-plain', config: located('set-daily') }],
        },
      ],
    }
    const boards = ['Projects/Pommora', 'Areas/Health'].map((space) =>
      tileDocPath(join(contextsDir(root), space)),
    )
    for (const board of boards) await putJson(board, doc)
    await del('.nexus/contexts/Areas/Health', 'space')
    await del('Journal', 'collection')
    const [trashed] = (await listBundles(root, { kind: 'trash' })).filter(
      (b) => b.record.entity === 'space',
    )
    const tiles = [boards[0], tileDocPath(join(root, trashed.bundlePath, 'Health'))]
    const { filter, ...unfiltered } = located('set-daily')
    for (const board of tiles)
      expect(
        ((await readJsonAt(board)).tiles as { views: { config: unknown }[] }[])[0].views[0].config,
      ).toEqual(unfiltered)
  })

  it('a Set moved to another Collection takes its location from the views a Set trashed from the Collection it left holds', async () => {
    await putJson(join(root, 'Journal', 'Weekly', '_pageset.json'), {
      id: 'set-weekly',
      views: [located('set-daily')],
    })
    await del('Journal/Weekly', 'set')
    await refreshTree(root)
    const moved = await settledMutate(root, {
      op: 'moveSet',
      path: 'Journal/Daily',
      newParentPath: 'Plain',
      order: ['set-daily'],
    })
    expect(moved.ok).toBe(true)
    const weekly = await bundleOf('Weekly')
    const { filter, ...unfiltered } = located('set-daily')
    expect((await readJsonAt(join(root, weekly, 'Weekly', '_pageset.json'))).views).toEqual([
      unfiltered,
    ])
  })

  it.each([
    [false, true],
    [false, false],
    [true, true],
    [true, false],
  ])('a page pulled while its Set’s delete still owes its strip comes off the strip, and Try Again keeps the linker on its landing (stepped aside %s, linker refused at the pull %s)', async (aside, refusedAtPull) => {
    await linker(gamma, GAMMA_ID, 'Related: "[[Daily/Alpha]]"')
    const refusal = failLandings((file) => file === join(root, gamma))
    await del('Journal/Daily', 'set')
    expect(await owed()).toContain('Journal/Daily/Alpha.md')
    if (aside) await page(join('Journal', 'Alpha.md'), ALEPH_ID)
    await refreshTree(root)
    if (!refusedAtPull) refusal.mockRestore()
    const bundle = await bundleOf('Daily')
    const r = await pull(join(bundle, 'Daily', 'Alpha.md'), INTO_JOURNAL)
    expect(r.ok && r.value.landedAs).toBe(aside ? 'Alpha (2)' : undefined)
    expect(await owed()).not.toContain('Journal/Daily/Alpha.md')
    refusal.mockRestore()
    expect((await settledMutate(root, { op: 'finishOwed' })).ok).toBe(true)
    expect((await frontmatter(gamma)).Related).toBe(
      aside ? '[[Journal/Alpha (2)|Alpha (2)]]' : '[[Journal/Alpha|Alpha]]',
    )
    expect(await readRecord(join(root, bundle))).not.toHaveProperty('links')
  })

  it('a Set pulled from a trashed Collection keeps its own and its sub-Set’s views once the Collection’s owed view edit runs, and a filter naming a Set still in the bundle drops', async () => {
    await putJson(join(root, 'Journal', 'Daily', 'Sub', '_pageset.json'), { id: 'set-sub' })
    await putJson(join(root, 'Journal', 'Weekly', '_pageset.json'), { id: 'set-weekly' })
    const sidecar = join(root, 'Plain', '_pagecollection.json')
    const views = ['set-daily', 'set-sub', 'set-weekly'].map(located)
    await writeFile(sidecar, JSON.stringify({ id: 'col-plain', views }))
    const refusal = failLandings((file) => file === sidecar)
    await del('Journal', 'collection')
    refusal.mockRestore()
    const entry = Object.values(await readNotes(root)).find((e) => e.kind === 'container')
    expect(entry?.edit).toMatchObject({
      ids: expect.arrayContaining(['set-daily', 'set-sub', 'set-weekly']),
    })
    const bundle = await bundleOf('Journal')
    expect((await pull(join(bundle, 'Journal', 'Daily'), INTO_PLAIN)).ok).toBe(true)
    expect((await settledMutate(root, { op: 'finishOwed' })).ok).toBe(true)
    const { filter, ...unfiltered } = views[2]
    expect((await readJsonAt(sidecar)).views).toEqual([views[0], views[1], unfiltered])
  })

  it('a Set restored whole keeps the views naming a Set inside it archived since, once its delete’s owed view edit runs', async () => {
    const { sidecar, views, bundle } = await owingSetViews()
    expect((await pull(bundle)).ok).toBe(true)
    const archived = { op: 'archive', path: 'Journal/Daily/Sub', kind: 'set' } as const
    expect((await settledMutate(root, archived)).ok).toBe(true)
    await finish()
    expect((await readJsonAt(sidecar)).views).toEqual(views)
  })

  it('a Set pulled from a trashed Set and archived since keeps its views once the delete’s owed view edit runs, and the Set still in the bundle drops', async () => {
    const { sidecar, views, bundle } = await owingSetViews()
    expect((await pull(join(bundle, 'Daily', 'Sub'), INTO_PLAIN)).ok).toBe(true)
    const archived = { op: 'archive', path: 'Plain/Sub', kind: 'set' } as const
    expect((await settledMutate(root, archived)).ok).toBe(true)
    await finish()
    const { filter, ...unfiltered } = views[0]
    expect((await readJsonAt(sidecar)).views).toEqual([unfiltered, views[1]])
  })

  it('a Collection whose Archive refuses to go stays whole in the Trash, owning its Archive, and nothing is taken', async () => {
    const archived = { op: 'archive', path: 'Journal/Daily', kind: 'set' } as const
    expect((await settledMutate(root, archived)).ok).toBe(true)
    await del('Journal', 'collection')
    const sidecar = join(root, 'Plain', '_pagecollection.json')
    const views = [located('set-daily')]
    await writeFile(sidecar, JSON.stringify({ id: 'col-plain', views }))
    await refreshTree(root)
    const archive = join(root, '.nexus', 'archive', 'col-journal')
    installMachine({
      ...diskMachine(),
      trashToSystem: async (p) => {
        if (p === archive) throw new Error('refused')
        await rm(p, { recursive: true })
      },
    })
    const emptied = { op: 'emptyBundle', bundlePath: await bundleOf('Journal') } as const
    expect((await settledMutate(root, emptied)).ok).toBe(false)
    expect((await listBundles(root, { kind: 'trash' })).map((b) => b.artifactName)).toContain(
      'Journal',
    )
    expect(await readNotes(root)).toEqual({})
    await finish()
    expect((await readJsonAt(sidecar)).views).toEqual(views)
    await settleArchives(root, await readNexus(root))
    expect(await listBundles(root, { kind: 'archive', id: 'col-journal' })).toHaveLength(1)
  })
})
