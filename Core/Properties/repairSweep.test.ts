import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assignProperty } from './assignment'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newContentId, newId } from '../Nexus/ids'
import { createTestPage } from '../Testing/createTestPage'
import { createProperty } from './registryProperty'
import { seedContentIndex } from '../Index/indexSeed'
import { runRepairSweep } from './repairSweep'
import * as walk from '../Nexus/readNexus'
import { refreshTree } from '../Nexus/liveTree'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'

let root: string
let page: string
let tagsId: string
let colId: string

const settings = (repairOnOpen: boolean): Promise<void> =>
  writeFile(
    join(root, '.nexus', 'settings.json'),
    JSON.stringify({ personalization: { repairOnOpen } }),
  )

const frontmatter = async (keys: string): Promise<void> => {
  const content = await readFile(page, 'utf8')
  await writeFile(page, content.replace(/\n---\n/, `\n${keys}\n---\n`))
}

beforeEach(async () => {
  root = tempRoot('pom-repair-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(contextsDir(root), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: '01ARZ3NDEKPSV4RRFFQ69G5FAV' }),
  )
  await settings(true)
  const status = await createProperty(root, {
    label: 'Status',
    type: 'status',
  })
  const tags = await createProperty(root, {
    label: 'Tags',
    type: 'multiSelect',
    select_options: [{ id: 'opt_alpha', key: 'alpha', label: 'alpha' }],
  })
  if (!status.ok || !tags.ok) throw new Error('registry failed')
  tagsId = tags.value.id
  colId = newId()
  const col = await createFolderEntity(root, 'collection', 'Col', colId)
  if (!col.ok) throw new Error('folder failed')
  await assignProperty(root, col.value.path, status.value.id)
  await assignProperty(root, col.value.path, tagsId)
  const p = await createTestPage(col.value.path, 'One', { body: 'b' })
  if (!p.ok) throw new Error('page failed')
  page = p.value.path
  installStores(memoryStores().stores)
  await refreshTree(root)
  await seedContentIndex(root)
})
afterEach(async () => {
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('runRepairSweep', () => {
  it('canonicalizes a drifted page the seed re-read', async () => {
    await frontmatter('Status:\n  - Open\n  - Open\nTags:\n  - alpha\n  - zeta')
    await runRepairSweep(root, await seedContentIndex(root))
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status:\n  - Open\nTags')
    expect(out).toContain('- zeta')
  })

  it('canonicalizes a drifted archived page against its own Collection’s definitions', async () => {
    const archived = join(
      root,
      `.nexus/archive/${colId}/Col/2026-10-20T12-00-00-000Z__Two.md.archived/Two.md`,
    )
    await mkdir(dirname(archived), { recursive: true })
    await writeFile(
      archived,
      `---\nID: ${newContentId('page')}\nStatus:\n  - Open\n  - Open\n---\n\nb\n`,
    )
    await runRepairSweep(root, await seedContentIndex(root))
    expect(await readFile(archived, 'utf8')).toContain('Status:\n  - Open\n---')
  })

  it('walks the tree once however many re-read pages it checks', async () => {
    for (const title of ['Two', 'Three']) {
      const p = await createTestPage(join(root, 'Col'), title, { body: 'b' })
      if (!p.ok) throw new Error('page failed')
      await writeFile(
        p.value.path,
        (await readFile(p.value.path, 'utf8')).replace(/\n---\n/, '\nStatus: Open\n---\n'),
      )
    }
    await frontmatter('Status: Open')
    const reread = await seedContentIndex(root)
    const walks = vi.spyOn(walk, 'readNexus')
    await runRepairSweep(root, reread)
    expect(walks).toHaveBeenCalledTimes(1)
    walks.mockRestore()
  })

  it.each([
    'Status:',
    'Status: null',
    'Status: ""',
    'Status: "   "',
  ])('lifts the blank governed lines `%s` and `Tags: []`, leaving an ungoverned bare key', async (line) => {
    await frontmatter(`${line}\nTags: []\nMood:`)
    await runRepairSweep(root, await seedContentIndex(root))
    const out = await readFile(page, 'utf8')
    expect(out).not.toContain('Status')
    expect(out).not.toContain('Tags')
    expect(out).toContain('Mood:\n')
  })

  it('with the toggle off nothing is written', async () => {
    await settings(false)
    await refreshTree(root)
    await frontmatter('Status: Open')
    const before = (await stat(page)).mtimeMs
    await runRepairSweep(root, await seedContentIndex(root))
    expect((await stat(page)).mtimeMs).toBe(before)
    expect(await readFile(page, 'utf8')).toContain('Status: Open')
  })

  it('with no setting written, the sweep repairs', async () => {
    await rm(join(root, '.nexus', 'settings.json'))
    await refreshTree(root)
    await frontmatter('Status:\n  - Open\n  - Open')
    await runRepairSweep(root, await seedContentIndex(root))
    expect(await readFile(page, 'utf8')).toContain('Status:\n  - Open\n---')
  })

  it('a canonical page is never rewritten', async () => {
    await frontmatter('Status:\n  - Open')
    const before = (await stat(page)).mtimeMs
    await runRepairSweep(root, await seedContentIndex(root))
    expect((await stat(page)).mtimeMs).toBe(before)
  })

  it('a sweep whose session database moved writes nothing', async () => {
    await frontmatter('Status: Open')
    const reread = await seedContentIndex(root)
    installStores(NO_STORES)
    await runRepairSweep(root, reread)
    expect(await readFile(page, 'utf8')).toContain('Status: Open')
  })

  it('never removes a value — an option outside the definition stays as written, as does a scalar spelling its option', async () => {
    await frontmatter('Status: Blocked\nTags: alpha')
    await runRepairSweep(root, await seedContentIndex(root))
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Blocked')
    expect(out).toContain('Tags: alpha\n')
  })

  it('a cold index — the first open of a database — sweeps nothing', async () => {
    installStores(NO_STORES)
    await frontmatter('Status: Open')
    installStores(memoryStores().stores)
    await runRepairSweep(root, await seedContentIndex(root))
    expect(await readFile(page, 'utf8')).toContain('Status: Open')
  })

  it('never removes a value — a mixed Context list keeps its unresolvable Space', async () => {
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'Projects' }] }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Alpha'), { recursive: true })
    await writeFile(join(contextsDir(root), 'Projects', 'Alpha', '_space.json'), '{"id":"sp-a"}')
    await refreshTree(root)
    await frontmatter('<Projects>:\n  - Alpha\n  - Zeta')
    await runRepairSweep(root, await seedContentIndex(root))
    const out = await readFile(page, 'utf8')
    expect(out).toContain('- Alpha')
    expect(out).toContain('- Zeta')
  })

  it('a page the seed did not re-read is not touched', async () => {
    await frontmatter('Status:\n  - Open')
    const reread = await seedContentIndex(root)
    await frontmatter('Status: Open')
    await runRepairSweep(root, reread)
    expect(await readFile(page, 'utf8')).toContain('Status: Open')
  })

  it('a re-read page holding another casing of a list key stays byte for byte', async () => {
    await refreshTree(root)
    await frontmatter('tags: [alpha]')
    const before = await readFile(page, 'utf8')
    await runRepairSweep(root, await seedContentIndex(root))
    expect(await readFile(page, 'utf8')).toBe(before)
  })

  it('a re-read page’s Context key keeps its spelling, byte for byte', async () => {
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'Projects' }] }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'), '{"id":"sp-p"}')
    await refreshTree(root)
    await frontmatter('<Projects>: [pommora]')
    const before = await readFile(page, 'utf8')
    await runRepairSweep(root, await seedContentIndex(root))
    expect(await readFile(page, 'utf8')).toBe(before)
  })
})
