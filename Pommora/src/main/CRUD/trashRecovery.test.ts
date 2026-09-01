// The end-to-end proof: every restoration combination the surface can produce, driven through the
// same ops the leaf calls, against a real nexus on disk.
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pathExists } from '../IO/atomicWrite'
import { handleMutate, type MutateDeps } from '../mutate'
import { contextsDir, contextsRegistryFile } from '../paths'
import { listBundles } from '../provenance'
import { trashRows } from './trashRows'
import { readNexus } from '../readNexus'
import { closeSession, openSession } from '../session'

let root: string
const handed: string[] = []
const deps: MutateDeps = {
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
  const r = await handleMutate({ op: 'delete', path, kind } as never, deps)
  expect(r.ok, `delete ${path}`).toBe(true)
}

beforeEach(async () => {
  handed.length = 0
  root = await mkdtemp(join(tmpdir(), 'pom-e2e-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
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
      order: ['prop_status'],
      defs: {
        prop_status: {
          id: 'prop_status',
          name: 'Status',
          type: 'select',
          select_options: [{ value: 'live', label: 'Live', color: 'green' }],
        },
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
    JSON.stringify({ id: 'col-journal', properties: ['prop_status'] }),
  )
  await writeFile(
    join(root, 'Journal', 'Daily', '_pageset.json'),
    JSON.stringify({ id: 'set-daily' }),
  )
  await writeFile(
    join(root, 'Journal', 'Daily', 'Alpha.md'),
    '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVA\nStatus: live\n---\nbody\n',
  )
  await mkdir(join(root, 'Plain'), { recursive: true })
  await writeFile(join(root, 'Plain', '_pagecollection.json'), JSON.stringify({ id: 'col-plain' }))
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('end to end — deleted, listed, restored', () => {
  it('a page deleted and restored comes back where it was, and leaves the list', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    const row = await find('Alpha')
    expect(row.homeResolves).toBe(true)
    expect(row.crumbs.map((c) => c.title)).toEqual(['Journal', 'Daily'])
    const r = await handleMutate({ op: 'restore', bundlePath: row.bundlePath }, deps)
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Journal', 'Daily', 'Alpha.md'))).toBe(true)
    expect(await rows()).toHaveLength(0)
  })

  it('a renamed parent is followed — the row reads the new name and the file lands in it', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    expect(
      (
        await handleMutate(
          { op: 'rename', path: 'Journal', kind: 'collection', newName: 'Logbook' },
          deps,
        )
      ).ok,
    ).toBe(true)
    const row = await find('Alpha')
    expect(row.crumbs.map((c) => c.title)).toEqual(['Logbook', 'Daily'])
    expect((await handleMutate({ op: 'restore', bundlePath: row.bundlePath }, deps)).ok).toBe(true)
    expect(await pathExists(join(root, 'Logbook', 'Daily', 'Alpha.md'))).toBe(true)
  })

  it('a Space restores into a RENAMED Context, and its breadcrumb said so first', async () => {
    await del('.nexus/contexts/Projects/Pommora', 'space')
    expect(
      (
        await handleMutate(
          { op: 'renameContext', contextId: 'ctx_projects', newName: 'Ventures' },
          deps,
        )
      ).ok,
    ).toBe(true)
    const row = await find('Pommora')
    expect(row.crumbs).toEqual([{ kind: 'context', title: 'Ventures' }])
    expect((await handleMutate({ op: 'restore', bundlePath: row.bundlePath }, deps)).ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora', '_space.json'))).toBe(
      true,
    )
  })

  it('the restoration matrix: every homeless kind lands where it is told', async () => {
    // page → Set
    await del('Journal/Daily/Alpha.md', 'page')
    let row = await find('Alpha')
    expect(
      (
        await handleMutate(
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
    expect((await handleMutate({ op: 'restore', bundlePath: row.bundlePath }, deps)).ok).toBe(false)
    expect(
      (
        await handleMutate(
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

    // Set → Collection
    const setRow = await find('Daily')
    expect(
      (
        await handleMutate(
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

    // Space → a different Context
    await del('.nexus/contexts/Projects/Pommora', 'space')
    await del('.nexus/contexts/Projects', 'context')
    const spaceRow = await find('Pommora')
    expect(spaceRow.homeResolves).toBe(false)
    expect(
      (
        await handleMutate(
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
        await handleMutate(
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
    expect(landed.includes('PageID:')).toBe(true)
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
      expect((await handleMutate({ op: 'restore', bundlePath: r.bundlePath }, deps)).ok).toBe(true)
    expect((await rows()).map((r) => r.title)).toEqual(['Alpha'])
  })

  it('emptying hands the artifact over, and the switch decides whether it goes at all', async () => {
    await del('Journal/Daily/Alpha.md', 'page')
    let row = await find('Alpha')
    expect((await handleMutate({ op: 'emptyBundle', bundlePath: row.bundlePath }, deps)).ok).toBe(
      true,
    )
    expect(handed).toHaveLength(1)
    expect(handed[0].endsWith('Alpha.md')).toBe(true)
    expect(await rows()).toHaveLength(0)

    await writeFile(
      join(root, 'Journal', 'Beta.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVB\n---\nb\n',
    )
    await del('Journal/Beta.md', 'page')
    row = await find('Beta')
    const permanent: MutateDeps = { ...deps, permanentDelete: true }
    expect(
      (await handleMutate({ op: 'emptyBundle', bundlePath: row.bundlePath }, permanent)).ok,
    ).toBe(true)
    expect(handed).toHaveLength(1) // unchanged: it never reached the system trash
    expect(await rows()).toHaveLength(0)
  })
})
