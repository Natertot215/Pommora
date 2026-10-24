import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import {
  atomicWriteFile,
  editJsonStrict,
  rewritePageSerialized,
  rewritePreservingTimes,
  updateNexusConfig,
  writeJson,
} from '../Files/atomicWrite'
import { nexusConfig } from '../Paths/paths'
import { NEXUS_CONFIG_FILES, OWED_REL } from '../Paths/nexusPaths'
import { closeSession, openSession } from '../Nexus/session'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { listBundles } from '../Bundles/bundle'
import { readRegistry } from './propertiesRegistry'
import { createProperty, configureProperty, renameProperty } from './registryProperty'
import { deleteProperty } from './deleteProperty'
import { clearOption, editOption, deleteOption, renameOption } from './optionOps'
import { readNotes } from '../Nexus/owed'

vi.mock('../Files/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Files/atomicWrite')>()
  return {
    ...mod,
    atomicWriteFile: vi.fn(mod.atomicWriteFile),
    editJsonStrict: vi.fn(mod.editJsonStrict),
    writeJson: vi.fn(mod.writeJson),
    rewritePageSerialized: vi.fn(mod.rewritePageSerialized),
    rewritePreservingTimes: vi.fn(mod.rewritePreservingTimes),
    updateNexusConfig: vi.fn(mod.updateNexusConfig),
  }
})

let root: string
const notesFile = (): string => join(root, OWED_REL)
const abs = (...segs: string[]): string => join(root, ...segs)

let observed: { path: string; noted: boolean }[]

beforeEach(async () => {
  root = tempRoot('pom-jwire-')
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(abs('.nexus', 'settings.json'), '{}')
  await mkdir(abs('Col'), { recursive: true })
  await createProperty(root, { id: 'prop_s', label: 'Stage', type: 'select' })
  await writeFile(
    abs('Col', '_pagecollection.json'),
    JSON.stringify({ id: 'c1', properties: ['prop_s'] }),
  )
  await writeFile(
    abs('Col', 'A.md'),
    '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAA\nStage: Draft\n---\nbody\n',
  )
  await writeFile(
    abs('Col', 'B.md'),
    '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAB\nStage: Draft\n---\nbody\n',
  )
  await openSession(root)
  observed = []
  const note = (path: string): void => {
    observed.push({ path, noted: existsSync(notesFile()) })
  }
  const real = await vi.importActual<typeof import('../Files/atomicWrite')>('../Files/atomicWrite')
  vi.mocked(atomicWriteFile).mockImplementation(async (path, data) => {
    note(path)
    return real.atomicWriteFile(path, data)
  })
  vi.mocked(writeJson).mockImplementation(async (path, data) => {
    note(path)
    return real.writeJson(path, data)
  })
  vi.mocked(rewritePageSerialized).mockImplementation(async (path, fn) => {
    note(path)
    return real.rewritePageSerialized(path, fn)
  })
  vi.mocked(rewritePreservingTimes).mockImplementation(async (path, data) => {
    note(path)
    return real.rewritePreservingTimes(path, data)
  })
  vi.mocked(editJsonStrict).mockImplementation(async (path, mutate) => {
    const noted = existsSync(notesFile())
    const outcome = await real.editJsonStrict(path, mutate)
    if (outcome === 'written') observed.push({ path, noted })
    return outcome
  })
  vi.mocked(updateNexusConfig).mockImplementation(async (at, file, mutate) => {
    const noted = existsSync(notesFile())
    let changed = false
    const r = await real.updateNexusConfig(at, file, (cur) => {
      const next = mutate(cur)
      changed = next !== null
      return next
    })
    if (r.ok && changed) observed.push({ path: nexusConfig(at, NEXUS_CONFIG_FILES[file]), noted })
    return r
  })
})
afterEach(async () => {
  vi.mocked(atomicWriteFile).mockRestore()
  vi.mocked(writeJson).mockRestore()
  vi.mocked(rewritePageSerialized).mockRestore()
  vi.mocked(rewritePreservingTimes).mockRestore()
  vi.mocked(editJsonStrict).mockRestore()
  vi.mocked(updateNexusConfig).mockRestore()
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

const pageWrites = (): { path: string; noted: boolean }[] =>
  observed.filter((o) => o.path.endsWith('.md'))

describe('the rename writer', () => {
  it('holds the entry across every page rewrite and clears it on settle', async () => {
    const r = await renameProperty(root, 'prop_s', 'Phase')
    expect(r.ok).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBe(2)
    expect(writes.every((w) => w.noted)).toBe(true)
    expect(await readNotes(root)).toEqual({})
    expect(await readFile(abs('Col', 'A.md'), 'utf8')).toContain('Phase: Draft')
  })

  it('writes no entry for a rename refused before the commit', async () => {
    await createProperty(root, { id: 'prop_o', label: 'Other', type: 'select' })
    const r = await renameProperty(root, 'prop_s', 'Other')
    expect(r.ok).toBe(false)
    expect(observed.some((o) => o.path === notesFile())).toBe(false)
  })

  it('writes no entry for a non-rename edit', async () => {
    const r = await configureProperty(root, 'prop_s', { icon: 'tag' })
    expect(r.ok).toBe(true)
    expect(observed.some((o) => o.path === notesFile())).toBe(false)
  })
})

describe('the delete writer', () => {
  it('notes after the snapshot, holds across the strip, and clears once it lands', async () => {
    const r = await deleteProperty(root, 'prop_s')
    expect(r.ok).toBe(true)
    const bundleWrites = observed.filter((o) => o.path.includes('.trash'))
    expect(bundleWrites.length).toBeGreaterThan(0)
    expect(bundleWrites.every((w) => !w.noted)).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBe(2)
    expect(writes.every((w) => w.noted)).toBe(true)
    expect(await readNotes(root)).toEqual({})
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
  })
})

describe('the option-op writers', () => {
  const withOptions = async (): Promise<void> => {
    await createProperty(root, {
      id: 'prop_t',
      label: 'Tags',
      type: 'select',
      select_options: [
        { id: 'opt_Draft', key: 'Draft', label: 'Draft' },
        { id: 'opt_Done', key: 'Done', label: 'Done' },
      ],
    })
    await writeFile(
      abs('Col', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', properties: ['prop_s', 'prop_t'] }),
    )
    await writeFile(
      abs('Col', 'C.md'),
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\nTags:\n  - Draft\n---\nbody\n',
    )
    observed = []
  }

  it('option-rename holds the entry across the cascade and clears it on settle', async () => {
    await withOptions()
    const r = await renameOption(root, 'prop_t', 'opt_Draft', 'Queued')
    expect(r.ok).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBeGreaterThan(0)
    expect(writes.every((w) => w.noted)).toBe(true)
    expect(await readNotes(root)).toEqual({})
    expect(await readFile(abs('Col', 'C.md'), 'utf8')).toContain('- Queued')
  })

  it('a refused option-rename notes nothing and touches no page', async () => {
    await withOptions()
    const r = await renameOption(root, 'prop_t', 'opt_Draft', 'Done')
    expect(r.ok).toBe(false)
    expect(pageWrites().length).toBe(0)
    expect(await readNotes(root)).toEqual({})
  })

  it('option-remove strips noted, drops the option, and clears', async () => {
    await withOptions()
    const r = await deleteOption(root, 'prop_t', 'opt_Draft')
    expect(r.ok).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBeGreaterThan(0)
    expect(writes.every((w) => w.noted)).toBe(true)
    expect(await readNotes(root)).toEqual({})
    const def = (await readRegistry(root)).defs.prop_t
    expect(def?.select_options?.map((o) => o.label)).toEqual(['Done'])
    expect(await readFile(abs('Col', 'C.md'), 'utf8')).not.toContain('Tags: Draft')
  })

  it('option-remove writes every saved view while the entry is held', async () => {
    await withOptions()
    await seedConfigSurfaces(root, abs('Col'), viewOn('prop_t', 'opt_Draft'))
    await refreshTree(root)
    observed = []
    expect((await deleteOption(root, 'prop_t', 'opt_Draft')).ok).toBe(true)
    const configWrites = observed.filter((o) =>
      /_page(collection|set)\.json$|_tiles\.json$|matrix\.json$/.test(o.path),
    )
    expect(configWrites.map((o) => o.path.slice(root.length + 1)).sort()).toEqual([
      '.nexus/contexts/Areas/Home/_tiles.json',
      '.nexus/interface/matrix.json',
      'Col/Deep/_pageset.json',
      'Col/_pagecollection.json',
    ])
    expect(configWrites.every((w) => w.noted)).toBe(true)
    expect(await readNotes(root)).toEqual({})
  })

  it('option-clear strips noted, keeps the option, and clears', async () => {
    await withOptions()
    const r = await clearOption(root, 'prop_t', 'opt_Draft')
    expect(r.ok).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBeGreaterThan(0)
    expect(writes.every((w) => w.noted)).toBe(true)
    expect(await readNotes(root)).toEqual({})
    const def = (await readRegistry(root)).defs.prop_t
    expect(def?.select_options?.map((o) => o.label)).toEqual(['Draft', 'Done'])
    expect(await readFile(abs('Col', 'C.md'), 'utf8')).not.toContain('Tags: Draft')
  })

  it('editOption never writes an entry', async () => {
    await withOptions()
    await editOption(root, 'prop_t', {
      op: 'add',
      groupId: 'select',
      id: 'opt_Solo',
      label: 'Solo',
    })
    expect(observed.some((o) => o.path === notesFile())).toBe(false)
  })
})

describe('a second nexus', () => {
  it('sweeps and clears its own entry while the session is open elsewhere', async () => {
    const other = tempRoot('pom-jwire2-')
    await mkdir(join(other, '.nexus'), { recursive: true })
    await writeFile(
      join(other, '.nexus', 'nexus.json'),
      JSON.stringify({ id: 'nx2', createdAt: 'x' }),
    )
    await writeFile(join(other, '.nexus', 'settings.json'), '{}')
    await mkdir(join(other, 'Col'), { recursive: true })
    await createProperty(other, { id: 'prop_s', label: 'Stage', type: 'select' })
    await writeFile(
      join(other, 'Col', '_pagecollection.json'),
      JSON.stringify({ id: 'c2', properties: ['prop_s'] }),
    )
    await writeFile(
      join(other, 'Col', 'A.md'),
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\nStage: Draft\n---\nbody\n',
    )
    const r = await renameProperty(other, 'prop_s', 'Phase')
    expect(r.ok).toBe(true)
    expect(await readFile(join(other, 'Col', 'A.md'), 'utf8')).toContain('Phase: Draft')
    expect(await readNotes(other)).toEqual({})
    await rm(other, { recursive: true, force: true })
  })
})
