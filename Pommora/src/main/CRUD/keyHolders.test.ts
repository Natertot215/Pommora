import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, mkdir, readFile, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rewritePageSerialized } from '../IO/atomicWrite'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { seedContentIndex } from '../indexSeed'
import { dropLiveTree } from '../liveTree'
import { createProperty, editProperty } from './registryProperty'
import { renameOption } from './optionOps'
import { deleteProperty } from './deleteProperty'
import { keyHolderFiles } from './keyHolders'
import { sweepGovernedRoots } from './governedSweep'

vi.mock('../IO/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../IO/atomicWrite')>()
  return { ...mod, rewritePageSerialized: vi.fn(mod.rewritePageSerialized) }
})

const openSpy = vi.mocked(rewritePageSerialized)

let root: string
const abs = (...segs: string[]): string => join(root, ...segs)
const page = (n: string, fm: string): Promise<void> =>
  writeFile(
    abs('Notes', `${n}.md`),
    `---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5${n.padStart(3, 'F').slice(-3).toUpperCase()}\n${fm}---\n\nbody\n`,
  )

/** 30 pages in the governing Collection, 2 holding the key; one un-adopted note also holds it
 *  and must stay outside every property pen's reach. */
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-keyh-'))
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(abs('.nexus', 'settings.json'), '{}')
  await mkdir(abs('Notes'), { recursive: true })
  await createProperty(root, { id: 'prop_s', name: 'Stage', type: 'select' })
  await writeFile(
    abs('Notes', '_pagecollection.json'),
    JSON.stringify({ id: 'c1', properties: ['prop_s'] }),
  )
  for (let i = 0; i < 28; i++) await page(`P${i}`, '')
  await page('HolderA', 'Stage: Draft\n')
  await page('HolderB', 'Stage: Draft\n')
  await mkdir(abs('Loose'), { recursive: true })
  await writeFile(abs('Loose', 'Note.md'), '---\nStage: Draft\n---\n\nun-governed\n')
  openSessionDb(root)
  await seedContentIndex(root)
  openSpy.mockClear()
})
afterEach(async () => {
  dropLiveTree()
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

describe('keyHolderFiles', () => {
  it('answers the queried holders intersected with the scope folders', async () => {
    const files = await keyHolderFiles(root, 'Stage', [abs('Notes')])
    expect(files.sort()).toEqual([abs('Notes', 'HolderA.md'), abs('Notes', 'HolderB.md')])
  })

  it('a name registered after the seed finds the pages already holding it, with no re-read', async () => {
    await page('Late', 'Notes: x\n')
    await seedContentIndex(root)
    await createProperty(root, { id: 'prop_n', name: 'Notes', type: 'url' })
    expect(await keyHolderFiles(root, 'Notes', [abs('Notes')])).toEqual([abs('Notes', 'Late.md')])
  })

  it('a rename onto a held key is refused through the index, and the un-governed note never counts', async () => {
    await page('Q9X', 'Phase: x\n')
    await writeFile(abs('Loose', 'Other.md'), '---\nPhase: y\n---\n\nun-governed\n')
    await seedContentIndex(root)
    const refused = await editProperty(root, 'prop_s', { name: 'Phase' })
    expect(refused.ok).toBe(false)
    expect((await editProperty(root, 'prop_s', { name: 'Step' })).ok).toBe(true)
  })

  it('with no index it answers the corpus intersected the same way', async () => {
    closeSessionDb()
    const files = await keyHolderFiles(root, 'Stage', [abs('Notes')])
    expect(files).toHaveLength(30)
    expect(files.some((f) => f.includes('Loose'))).toBe(false)
  })
})

describe('the property cascades open only the holders', () => {
  it('an option rename opens exactly the 2 holders, and the un-governed note keeps its value', async () => {
    const r = await renameOption(root, 'prop_s', 'Draft', 'Sketch')
    expect(r.ok).toBe(true)
    expect(openSpy).toHaveBeenCalledTimes(2)
    expect(await readFile(abs('Notes', 'HolderA.md'), 'utf8')).toContain('Sketch')
    expect(await readFile(abs('Loose', 'Note.md'), 'utf8')).toContain('Draft')
  })

  it('a nexus-wide governed sweep cannot reach an excluded folder (Requirement 9, total exclusion)', async () => {
    await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ excluded_folders: ['Vault'] }))
    await mkdir(abs('Vault'), { recursive: true })
    const excludedPage = `---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5XYZ\n<Areas>:\n  - Home\n---\n\nbody\n`
    await writeFile(abs('Vault', 'Tagged.md'), excludedPage)
    const swept = await sweepGovernedRoots(root, { kind: 'nexus' }, (raw) => {
      if (!('<Areas>' in raw)) return null
      const next = { ...raw }
      delete next['<Areas>']
      return { next }
    })
    expect(swept.touched).toEqual([])
    expect(await readFile(abs('Vault', 'Tagged.md'), 'utf8')).toBe(excludedPage)
  })

  it("a sweep keeps every holder's modification time", async () => {
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(abs('Notes', 'HolderA.md'), past, past)
    const swept = await sweepGovernedRoots(root, { kind: 'nexus' }, (raw) => {
      if (!('Stage' in raw)) return null
      const next = { ...raw }
      delete next.Stage
      return { next }
    })
    expect(swept.touched).toContain(abs('Notes', 'HolderA.md'))
    expect(Math.floor((await stat(abs('Notes', 'HolderA.md'))).mtimeMs / 1000)).toBe(
      Math.floor(past.getTime() / 1000),
    )
  })

  it('a delete snapshots and strips exactly the scoped holders — the un-governed note untouched', async () => {
    const before = await readFile(abs('Loose', 'Note.md'), 'utf8')
    const r = await deleteProperty(root, 'prop_s')
    expect(r.ok).toBe(true)
    expect(await readFile(abs('Notes', 'HolderA.md'), 'utf8')).not.toContain('Stage')
    expect(await readFile(abs('Notes', 'HolderB.md'), 'utf8')).not.toContain('Stage')
    expect(await readFile(abs('Loose', 'Note.md'), 'utf8')).toBe(before)
  })
})
