import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PropertyDefinition } from '@shared/properties'
import { assignProperty } from './CRUD/assignment'
import { createFolderEntity } from './CRUD/folderEntity'
import { createPage } from './CRUD/page'
import { createProperty } from './CRUD/registryProperty'
import { readRegistry } from './IO/propertiesRegistry'
import { seedContentIndex } from './indexSeed'
import { runRepairSweep } from './repairSweep'
import { refreshAfterWrite } from './liveTree'
import { closeSessionDb, openSessionDb } from './sessionDb'

let root: string
let page: string
let tagsId: string

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
  root = await mkdtemp(join(tmpdir(), 'pom-repair-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' }),
  )
  await settings(true)
  const status = await createProperty(root, {
    id: '',
    name: 'Status',
    type: 'status',
  } as PropertyDefinition)
  const tags = await createProperty(root, {
    id: '',
    name: 'Tags',
    type: 'multi_select',
    select_options: [{ value: 'alpha', label: 'alpha' }],
  } as PropertyDefinition)
  if (!status.ok || !tags.ok) throw new Error('registry failed')
  tagsId = tags.value.id
  const col = await createFolderEntity(root, 'collection', 'Col')
  if (!col.ok) throw new Error('folder failed')
  await assignProperty(root, col.value.path, status.value.id)
  await assignProperty(root, col.value.path, tagsId)
  const p = await createPage(col.value.path, 'One', { body: 'b' })
  if (!p.ok) throw new Error('page failed')
  page = p.value.path
  openSessionDb(root)
  await refreshAfterWrite(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

describe('runRepairSweep', () => {
  it('canonicalizes a drifted page the seed re-read and adopts its unknown option', async () => {
    await frontmatter('Status: Open\nTags:\n  - alpha\n  - zeta')
    await seedContentIndex(root)
    await runRepairSweep(root)
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status:\n  - Open')
    expect(out).toContain('- zeta')
    expect((await readRegistry(root)).defs[tagsId].select_options?.map((o) => o.value)).toEqual([
      'alpha',
      'zeta',
    ])
  })

  it('with the toggle off nothing is written', async () => {
    await settings(false)
    await refreshAfterWrite(root)
    await frontmatter('Status: Open')
    const before = (await stat(page)).mtimeMs
    await seedContentIndex(root)
    await runRepairSweep(root)
    expect((await stat(page)).mtimeMs).toBe(before)
    expect(await readFile(page, 'utf8')).toContain('Status: Open')
  })

  it('a canonical page is never rewritten', async () => {
    await frontmatter('Status:\n  - Open')
    const before = (await stat(page)).mtimeMs
    await seedContentIndex(root)
    await runRepairSweep(root)
    expect((await stat(page)).mtimeMs).toBe(before)
  })

  it('a sweep whose session database moved writes nothing', async () => {
    await frontmatter('Status: Open')
    await seedContentIndex(root)
    closeSessionDb()
    await runRepairSweep(root)
    expect(await readFile(page, 'utf8')).toContain('Status: Open')
  })

  it('never removes a value — an option outside the definition stays as written', async () => {
    await frontmatter('Status: Blocked\nTags: alpha')
    await seedContentIndex(root)
    await runRepairSweep(root)
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Blocked')
    expect(out).toContain('Tags:\n  - alpha')
  })

  it('adopts an unknown option on a page that needed no rewrite', async () => {
    await frontmatter('Tags:\n  - alpha\n  - zeta')
    const before = (await stat(page)).mtimeMs
    await seedContentIndex(root)
    await runRepairSweep(root)
    expect((await stat(page)).mtimeMs).toBe(before)
    expect((await readRegistry(root)).defs[tagsId].select_options?.map((o) => o.value)).toEqual([
      'alpha',
      'zeta',
    ])
  })

  it('a page the seed did not re-read is not touched', async () => {
    await frontmatter('Status:\n  - Open')
    await seedContentIndex(root)
    await frontmatter('Status: Open')
    await runRepairSweep(root)
    expect(await readFile(page, 'utf8')).toContain('Status: Open')
  })
})
