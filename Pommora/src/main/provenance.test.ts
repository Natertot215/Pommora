import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pathExists } from './io/atomicWrite'
import { handleMutate, type MutateDeps } from './mutate'
import { contextsDir, contextsRegistryFile } from './paths'
import { readPair } from './provenance'
import { readNexus } from './readNexus'
import { closeSession, openSession } from './session'

const PAGE_A = '01KVGMT8BFG350FZZXAMG1QDVA'
const nexusDeps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

/** Every pair file under .trash, recursively. */
async function pairFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries: import('node:fs').Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const abs = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await pairFiles(abs)))
    else if (e.name.endsWith('.provenance.json')) out.push(abs)
  }
  return out
}

const onlyPair = async (): Promise<{ file: string; pair: unknown }> => {
  const files = await pairFiles(join(root, '.trash'))
  expect(files).toHaveLength(1)
  return { file: files[0], pair: await readPair(files[0]) }
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-prov-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: '2026' }))
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({
      contexts: [{ id: 'ctx_projects', title: 'Projects', singular: 'Project', icon: 'target' }],
    }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
    JSON.stringify({ id: 'sp-pom' }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
    JSON.stringify({ id: 'sp-sap', '(Projects)': ['Pommora'] }),
  )
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
  await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 'set-daily' }))
  await writeFile(
    join(root, 'Notes', 'Daily', 'Alpha.md'),
    `---\nPageID: ${PAGE_A}\n(Projects):\n  - Pommora\n---\nbody`,
  )
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('the pair — one JSON beside every nexus-trashed artifact', () => {
  it('a page delete records identity + its parent container by the id the walk assigns', async () => {
    const tree = await readNexus(root)
    const dailyId = tree.collections[0].sets[0].id
    expect(dailyId).toBe('set-daily')

    const r = await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    expect(r.ok).toBe(true)
    const { file, pair } = await onlyPair()
    expect(file.endsWith('Alpha.md.provenance.json')).toBe(true)
    expect(pair).toMatchObject({
      entity: 'page',
      id: PAGE_A,
      parent: { kind: 'container', id: dailyId },
    })
  })

  it('a root Collection delete records parent root; the pair sits beside the folder artifact', async () => {
    const r = await handleMutate({ op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
    expect(r.ok).toBe(true)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({ entity: 'collection', id: 'col-notes', parent: { kind: 'root' } })
  })

  it('a Space delete records its context parent and the id-bearing roots that tagged it', async () => {
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({
      entity: 'space',
      id: 'sp-pom',
      parent: { kind: 'context', id: 'ctx_projects' },
    })
    const members = (pair as { members: { id: string; kind: string }[] }).members
    expect(members).toContainEqual({ id: PAGE_A, kind: 'page' })
    expect(members).toContainEqual({ id: 'sp-sap', kind: 'space' })
    expect(members).toHaveLength(2)
  })

  it('a Context delete records its registry entry and the outside membership map, spaces as {id, title}', async () => {
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({
      entity: 'context',
      registry: { id: 'ctx_projects', title: 'Projects', singular: 'Project', icon: 'target' },
    })
    const membership = (
      pair as {
        membership: { root: { id?: string; kind: string }; spaces: { id?: string; title: string }[] }[]
      }
    ).membership
    // The outside page is the only membership root — the in-Context Sapphire is a passenger
    // whose own links ride the trash intact.
    expect(membership).toHaveLength(1)
    expect(membership[0].root).toEqual({ id: PAGE_A, kind: 'page' })
    expect(membership[0].spaces).toEqual([{ id: 'sp-pom', title: 'Pommora' }])
  })

  it('system trash mode writes no pair — there is nowhere valid for it to point', async () => {
    const systemDeps: MutateDeps = { trashMode: 'system', trashToSystem: async () => {} }
    const r = await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, systemDeps)
    expect(r.ok).toBe(true)
    expect(await pairFiles(join(root, '.trash'))).toHaveLength(0)
  })

  it('all-or-nothing: an unreadable registry means a Context delete writes NO pair, and the delete still lands', async () => {
    await writeFile(contextsRegistryFile(root), '{corrupt')
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pairFiles(join(root, '.trash'))).toHaveLength(0)
    // The artifact itself still trashed recoverably.
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
  })

  it('writePair → readPair round-trips exactly; a malformed pair file reads null', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const { file, pair } = await onlyPair()
    expect(await readPair(file)).toEqual(pair)
    await writeFile(file, '{not a pair')
    expect(await readPair(file)).toBeNull()
    await writeFile(file, JSON.stringify({ hello: 'world' }))
    expect(await readPair(file)).toBeNull()
  })

  it('an unreadable parent sidecar degrades to unaddressable — the pair is still written', async () => {
    await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), '{corrupt')
    const r = await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    expect(r.ok).toBe(true)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({ entity: 'page', id: PAGE_A, parent: { kind: 'unaddressable' } })
  })
})
